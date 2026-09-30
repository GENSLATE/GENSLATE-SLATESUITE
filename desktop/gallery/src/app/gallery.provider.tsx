import { useToast } from '@genslate/design-system';
import { type ReactNode, useEffect, useEffectEvent, useState } from 'react';

import type { GalleryBackend } from '../ipc/gallery.client';
import { listenTo } from '../ipc/gallery.events';
import type { Collection, GalleryContext, Query, ScanDone, Settings } from '../ipc/gallery.types';
import { collectionKey, parseCollectionKey } from '../model/collection.util';
import { plural } from '../model/format.util';
import { EMPTY_SELECTION, pruneSelection, type Selection } from '../model/selection.util';
import {
  type DialogState,
  type Filters,
  type GalleryApi,
  GalleryApiContext,
  type Mode,
  NO_FILTERS,
  type SearchMode,
  type SidePanelId,
} from './gallery.context';
import { loadPreference, savePreference } from './preferences.util';
import { useLibrary } from './use-library.hook';
import { useMediaActions } from './use-media-actions.hook';
import { useTasks } from './use-tasks.hook';

const SIDE_PANELS: readonly string[] = [
  'library',
  'folders',
  'places',
  'people',
  'memories',
  'assistant',
] satisfies SidePanelId[];

function initialSidePanel(): SidePanelId {
  const saved = loadPreference('side-panel');
  return saved !== null && SIDE_PANELS.includes(saved) ? (saved as SidePanelId) : 'library';
}

function initialCollection(): Collection {
  const saved = loadPreference('collection');
  return (saved === null ? null : parseCollectionKey(saved)) ?? { type: 'all' };
}

interface GalleryProviderProps {
  readonly backend: GalleryBackend;
  readonly context: GalleryContext;
  readonly children: ReactNode;
}

/** Owns Gallery's state (collection, items, selection, mode, dialogs) as `useGallery()`. */
export function GalleryProvider({ backend, context, children }: GalleryProviderProps) {
  const toast = useToast();
  const [settings, setSettings] = useState(context.settings);
  const [collection, setCollectionState] = useState(initialCollection);
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('words');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [mode, setMode] = useState<Mode>({ type: 'browse' });
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidePanel, setSidePanelState] = useState(initialSidePanel);
  const [sidebarOpen, setSidebarOpenState] = useState(() => loadPreference('sidebar') !== 'closed');

  const query: Query = {
    collection,
    // A description search is a preview: it doesn't filter yet.
    search: searchMode === 'words' ? search : '',
    sort: settings.sortBy,
    descending: settings.sortDescending,
    kind: filters.kind,
    favoritesOnly: filters.favoritesOnly,
    minRating: filters.minRating,
    from: null,
    to: null,
    includeVideos: settings.showVideos,
  };

  const onScanDone = (done: ScanDone) => {
    const changes = done.added + done.updated;
    if (done.errors.length > 0) {
      toast.add({
        title: 'Some folders couldn’t be scanned',
        description: done.errors[0]?.message,
        type: 'warning',
      });
    } else if (changes > 0) {
      toast.add({ title: `Found ${plural(changes, 'new photo')}`, type: 'success', timeout: 2500 });
    }
  };
  const report = (title: string, error: unknown) => actions.report(title, error);
  const library = useLibrary(backend, query, onScanDone, (error) =>
    report('Couldn’t read the library', error),
  );
  const byId = new Map(library.items.map((item) => [item.id, item]));
  const actions = useMediaActions({
    backend,
    initialUndo: context.undo,
    canRestore: context.canRestore,
    reload: library.reload,
    nameOf: (id) => byId.get(id)?.name,
  });
  const tasks = useTasks(backend, actions.report);

  // Keep the selection to what is listed.
  const order = library.items.map((item) => item.id);
  const pruned = pruneSelection(selection, order);
  if (!library.loading && pruned !== selection) setSelection(pruned);

  const chosen = new Set(selection.selected);
  const selected = library.items.filter((item) => chosen.has(item.id));
  const shownId =
    mode.type === 'browse' ? selection.focus : mode.type === 'compare' ? mode.ids[0] : mode.id;
  const current = shownId === null ? null : (byId.get(shownId) ?? null);

  // A second launch (or the first one) asked to open files or folders.
  const openPaths = useEffectEvent((paths: readonly string[]) => {
    if (paths.length === 0) return;
    backend.openPaths(paths).then(
      (opened) => {
        library.reload();
        const [first] = opened.ids;
        if (first !== undefined) {
          setCollectionState({ type: 'all' });
          setMode({ type: 'view', id: first });
        } else if (opened.folders[0] !== undefined) {
          setCollectionState({ type: 'folder', path: opened.folders[0] });
        }
      },
      (error: unknown) => actions.report('Couldn’t open it', error),
    );
  });
  useEffect(() => openPaths(context.launch), [context.launch]);
  useEffect(() => listenTo(backend, { open: (paths) => openPaths(paths) }), [backend]);

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    backend.setSetting(key, value).then(setSettings, (error: unknown) => {
      setSettings(previous);
      actions.report('Couldn’t save the setting', error);
    });
  }

  function setCollection(next: Collection) {
    setCollectionState(next);
    setSelection(EMPTY_SELECTION);
    setMode({ type: 'browse' });
    savePreference('collection', collectionKey(next));
  }

  const api: GalleryApi = {
    backend,
    context,
    settings,
    updateSetting,
    summary: library.summary,
    collection,
    setCollection,
    search,
    setSearch,
    searchMode,
    setSearchMode,
    filters,
    setFilters,
    items: library.items,
    loading: library.loading,
    revision: library.revision,
    itemById: (id) => byId.get(id),
    scan: library.scan,
    selection,
    select: setSelection,
    selected,
    current,
    mode,
    setMode,
    openViewer(id) {
      setSelection({ selected: [id], anchor: id, focus: id });
      setMode({ type: 'view', id });
    },
    favorite: actions.favorite,
    rate: actions.rate,
    addTag: actions.addTag,
    removeTag: actions.removeTag,
    createAlbum: actions.createAlbum,
    renameAlbum: actions.renameAlbum,
    deleteAlbum(id) {
      actions.deleteAlbum(id);
      if (collection.type === 'album' && collection.id === id) setCollection({ type: 'all' });
    },
    addToAlbum(album, ids) {
      const name = library.summary?.albums.find((entry) => entry.id === album)?.name ?? 'the album';
      actions.addToAlbum(album, ids, name);
    },
    removeFromAlbum: actions.removeFromAlbum,
    rename: actions.rename,
    move: actions.move,
    copy: actions.copy,
    trash(ids, confirmed = false) {
      if (ids.length === 0) return;
      if (settings.confirmTrash && !confirmed) {
        setDialog({ type: 'trash', ids });
        return;
      }
      // Leave the viewer when its photo goes.
      if (mode.type !== 'browse' && mode.type !== 'compare' && ids.includes(mode.id)) {
        setMode({ type: 'browse' });
      }
      actions.trash(ids);
    },
    restore: actions.restore,
    forget: actions.forget,
    undo: actions.undo,
    undoLabel: actions.undoLabel,
    open: actions.open,
    reveal: actions.reveal,
    saveEdit: actions.saveEdit,
    copyText: actions.copyText,
    addFolder: actions.addFolder,
    addFolderPath: actions.addFolderPath,
    removeFolder(path) {
      actions.removeFolder(path);
      if (collection.type === 'folder' && collection.path.startsWith(path)) {
        setCollection({ type: 'all' });
      }
    },
    rescan: actions.rescan,
    tasks: tasks.tasks,
    cancelTask: tasks.cancelTask,
    exportItems: tasks.exportItems,
    duplicates: tasks.duplicates,
    findDuplicates: tasks.findDuplicates,
    dialog,
    openDialog: setDialog,
    closeDialog: () => setDialog({ type: 'none' }),
    paletteOpen,
    setPaletteOpen,
    infoOpen: settings.infoPanel,
    toggleInfo: () => updateSetting('infoPanel', !settings.infoPanel),
    sidePanel,
    setSidePanel(panel) {
      setSidePanelState(panel);
      savePreference('side-panel', panel);
    },
    sidebarOpen,
    setSidebarOpen(open) {
      setSidebarOpenState(open);
      savePreference('sidebar', open ? 'open' : 'closed');
    },
    report: actions.report,
  };

  return <GalleryApiContext value={api}>{children}</GalleryApiContext>;
}
