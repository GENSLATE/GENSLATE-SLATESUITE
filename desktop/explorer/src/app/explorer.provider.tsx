import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useReducer,
  useState,
  useSyncExternalStore,
} from 'react';

import type { ExplorerBackend } from '../ipc/explorer.client';
import { listenTo } from '../ipc/explorer.events';
import type { ExplorerContext, Settings, TransferMode } from '../ipc/explorer.types';
import { parentOf, samePath } from '../model/path.util';
import type { Selection } from '../model/selection.util';
import { filterEntries, sortEntries } from '../model/sort.util';
import {
  activeTab,
  createTab,
  type TabDefaults,
  type TabsState,
  tabsReducer,
} from '../model/tabs.reducer';
import {
  type Clipboard,
  type DialogState,
  type ExplorerApi,
  ExplorerApiContext,
  type SidePanelId,
} from './explorer.context';
import { ListingStore } from './listing.store';
import {
  loadFavorites,
  loadPreference,
  loadSession,
  saveFavorites,
  savePreference,
  saveSession,
} from './session.util';
import { useFileOperations } from './use-file-operations.hook';
import { useSearch } from './use-search.hook';
import { useTransfers } from './use-transfers.hook';

const SIDE_PANELS: readonly string[] = ['files', 'git', 'chat', 'smart'] satisfies SidePanelId[];

/** How often the drives' free space is re-read. */
const VOLUMES_INTERVAL = 30_000;

function defaultsOf(settings: Settings): TabDefaults {
  return {
    view: settings.view,
    sortBy: settings.sortBy,
    sortDescending: settings.sortDescending,
  };
}

/** The saved tabs (when `restore-tabs` is on), else one tab at the start folder. */
function initialTabs(context: ExplorerContext): TabsState {
  const saved = context.settings.restoreTabs ? loadSession() : null;
  if (saved !== null) {
    const tabs = saved.tabs.map((tab) => createTab(tab.path, tab));
    return { tabs, activeId: tabs[saved.active]?.id ?? tabs[0]?.id ?? '' };
  }
  const tab = createTab(context.startFolder, defaultsOf(context.settings));
  return { tabs: [tab], activeId: tab.id };
}

function initialFavorites(context: ExplorerContext): readonly string[] {
  const saved = loadFavorites();
  if (saved !== null) return saved;
  const pick = new Set(['documents', 'downloads', 'desktop']);
  return context.places.filter((place) => pick.has(place.id)).map((place) => place.path);
}

function initialSidePanel(): SidePanelId {
  const saved = loadPreference('side-panel');
  return saved !== null && SIDE_PANELS.includes(saved) ? (saved as SidePanelId) : 'files';
}

interface ExplorerProviderProps {
  readonly backend: ExplorerBackend;
  readonly context: ExplorerContext;
  readonly children: ReactNode;
}

/** Owns the explorer's state (tabs, listings, tasks, dialogs) and exposes it as `useExplorer()`. */
export function ExplorerProvider({ backend, context: initial, children }: ExplorerProviderProps) {
  const [context, setContext] = useState(initial);
  const [settings, setSettings] = useState(initial.settings);
  const [tabs, dispatch] = useReducer(tabsReducer, initial, initialTabs);
  const [store] = useState(() => new ListingStore(backend, initial.settings.showHidden));
  const listings = useSyncExternalStore(store.subscribe, store.snapshot);
  const [clipboard, setClipboardState] = useState<Clipboard | null>(null);
  const [favorites, setFavorites] = useState(() => initialFavorites(initial));
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidePanel, setSidePanelState] = useState(initialSidePanel);
  const [sidebarOpen, setSidebarOpenState] = useState(() => loadPreference('sidebar') !== 'closed');

  const tab = activeTab(tabs);
  const listing = listings.get(tab.path);
  const folderEntries = listing?.listing?.entries ?? [];
  const visible = tab.search
    ? tab.search.results
    : sortEntries(filterEntries(folderEntries, tab.filter), {
        by: tab.sortBy,
        descending: tab.sortDescending,
        foldersFirst: settings.foldersFirst,
      });
  const chosen = new Set(tab.selection.selected);
  const selected = visible.filter((entry) => chosen.has(entry.path));

  const refresh = (folders: readonly string[]) => store.refresh(folders);
  const reloadAll = () => store.reloadAll();
  const selectPaths = (paths: readonly string[]) =>
    dispatch({
      type: 'select',
      selection: { selected: paths, anchor: paths[0] ?? null, focus: paths[0] ?? null },
    });
  const openDialog = (next: DialogState) => setDialog(next);

  const operations = useFileOperations({
    backend,
    initialUndo: initial.undo,
    canUndoTrash: initial.canRestoreFromTrash,
    currentFolder: () => tab.path,
    refresh,
    reloadAll,
    selectPaths,
    relocate: (from, to) => dispatch({ type: 'relocate', from, to }),
  });
  const transfers = useTransfers({
    backend,
    openDialog,
    refresh,
    onLanded: (destination, targets) => {
      if (samePath(destination, tab.path)) selectPaths(targets);
    },
    undo: operations.undo,
  });
  const search = useSearch({
    backend,
    dispatch,
    runningId: tab.search?.status === 'running' ? tab.search.id : null,
    showHidden: settings.showHidden,
  });

  // The active tab's folder is always loaded (from the cache when it has one).
  useEffect(() => store.load(tab.path), [store, tab.path]);
  useEffect(() => store.setShowHidden(settings.showHidden), [store, settings.showHidden]);

  // Watch every open tab's folder, so changes made elsewhere show up live.
  const watched = [...new Set(tabs.tabs.map((item) => item.path))].sort().join('\n');
  useEffect(() => {
    backend
      .watch(watched === '' ? [] : watched.split('\n'))
      .catch((error: unknown) => console.warn('explorer: watching folders failed', error));
  }, [backend, watched]);

  const onChanged = useEffectEvent((folders: readonly string[]) => store.refresh(folders));
  useEffect(() => listenTo(backend, { changed: (folders) => onChanged(folders) }), [backend]);

  // Drives come and go (USB sticks) and fill up: re-read them now and then.
  useEffect(() => {
    const timer = window.setInterval(() => {
      backend.volumes().then(
        (volumes) => setContext((current) => ({ ...current, volumes })),
        (error: unknown) => console.warn('explorer: reading drives failed', error),
      );
    }, VOLUMES_INTERVAL);
    return () => window.clearInterval(timer);
  }, [backend]);

  useEffect(() => {
    saveSession({
      tabs: tabs.tabs.map(({ path, view, sortBy, sortDescending }) => ({
        path,
        view,
        sortBy,
        sortDescending,
      })),
      active: Math.max(
        0,
        tabs.tabs.findIndex((item) => item.id === tabs.activeId),
      ),
    });
  }, [tabs]);
  useEffect(() => saveFavorites(favorites), [favorites]);

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    backend.setSetting(key, value).then(setSettings, (error: unknown) => {
      setSettings(previous);
      operations.report('Couldn’t save the setting', error);
    });
  }

  function navigate(path: string, select?: readonly string[]) {
    dispatch({ type: 'open', path, select });
  }

  function trash(paths: readonly string[], confirmed = false) {
    if (paths.length === 0) return;
    if (settings.confirmTrash && !confirmed) setDialog({ type: 'trash', paths });
    else operations.trash(paths);
  }

  function setClipboard(mode: TransferMode, paths: readonly string[]) {
    setClipboardState(paths.length === 0 ? null : { mode, paths });
  }

  function paste(destination = tab.path) {
    if (clipboard === null) return;
    transfers.transfer(clipboard.mode, clipboard.paths, destination);
    // Cut items move once; copied items can be pasted again.
    if (clipboard.mode === 'move') setClipboardState(null);
  }

  const api: ExplorerApi = {
    backend,
    context,
    settings,
    updateSetting,
    tabs,
    tab,
    dispatch,
    listing,
    listingOf: (path) => listings.get(path),
    loadFolder: (path) => store.load(path),
    refresh() {
      store.load(tab.path, true);
      backend.volumes().then(
        (volumes) => setContext((current) => ({ ...current, volumes })),
        (error: unknown) => console.warn('explorer: reading drives failed', error),
      );
    },
    visible,
    selected,
    select: (selection: Selection) => dispatch({ type: 'select', selection }),
    navigate,
    newTab(path, activate) {
      dispatch({ type: 'new-tab', path, defaults: defaultsOf(settings), activate });
    },
    open: (entry) => operations.open(entry, (path) => navigate(path)),
    openWith: operations.openWith,
    reveal: operations.reveal,
    clipboard,
    setClipboard,
    paste,
    transfer: transfers.transfer,
    tasks: transfers.tasks,
    cancelTask: transfers.cancel,
    renaming: operations.renaming,
    startRename: operations.startRename,
    commitRename: operations.commitRename,
    cancelRename: operations.cancelRename,
    createItem: operations.createItem,
    duplicate(paths) {
      const folder = paths[0] === undefined ? null : parentOf(paths[0]);
      if (folder !== null) transfers.transfer('copy', paths, folder, 'keep-both');
    },
    trash,
    requestDelete: (paths) => {
      if (paths.length > 0) setDialog({ type: 'delete', paths });
    },
    deletePermanently: operations.deletePermanently,
    undo: operations.undo,
    undoLabel: operations.undoLabel,
    copyText: operations.copyText,
    search: (text, contents) => search.search(tab.path, text, contents),
    clearSearch: search.clear,
    favorites,
    toggleFavorite(path) {
      setFavorites((current) =>
        current.includes(path) ? current.filter((item) => item !== path) : [...current, path],
      );
    },
    dialog,
    openDialog,
    closeDialog: () => setDialog({ type: 'none' }),
    paletteOpen,
    setPaletteOpen,
    previewOpen: settings.previewPane,
    togglePreview: () => updateSetting('previewPane', !settings.previewPane),
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
    report: operations.report,
  };

  return <ExplorerApiContext value={api}>{children}</ExplorerApiContext>;
}
