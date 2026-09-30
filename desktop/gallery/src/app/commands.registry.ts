/**
 * Every Gallery action as a typed command: the palette lists them, the hotkeys run them and
 * the toolbar, viewer and menus share their labels, icons and shortcuts. The `AI` group is
 * reserved for the assistant: its commands are listed (so people discover them) but not
 * available yet.
 */
import type { CodiconRef } from '@genslate/design-system';

import type { MediaItem, ViewMode } from '../ipc/gallery.types';
import { invertSelection, selectAll } from '../model/selection.util';
import type { GalleryApi } from './gallery.context';

export type CommandGroup = 'Photo' | 'Edit' | 'Library' | 'View' | 'Go' | 'AI' | 'Help';

export type CommandId =
  | 'open'
  | 'edit'
  | 'favorite'
  | 'rate-0'
  | 'rate-1'
  | 'rate-2'
  | 'rate-3'
  | 'rate-4'
  | 'rate-5'
  | 'rename'
  | 'add-tag'
  | 'new-album'
  | 'move'
  | 'copy-to'
  | 'export'
  | 'trash'
  | 'restore'
  | 'open-default'
  | 'reveal'
  | 'copy-path'
  | 'slideshow'
  | 'compare'
  | 'select-all'
  | 'invert-selection'
  | 'undo'
  | 'add-folder'
  | 'rescan'
  | 'duplicates'
  | 'view-timeline'
  | 'view-grid'
  | 'view-details'
  | 'zoom-in'
  | 'zoom-out'
  | 'toggle-videos'
  | 'toggle-sidebar'
  | 'toggle-info'
  | 'find'
  | 'settings'
  | 'go-all'
  | 'go-favorites'
  | 'go-videos'
  | 'go-trash'
  | 'palette'
  | 'shortcuts'
  | 'ask'
  | 'describe-search'
  | 'describe'
  | 'auto-tag'
  | 'people'
  | 'memories'
  | 'find-alike'
  | 'auto-enhance'
  | 'remove-background'
  | 'erase-object'
  | 'upscale'
  | 'relight';

export interface GalleryCommand {
  readonly id: CommandId;
  readonly label: string;
  readonly group: CommandGroup;
  readonly icon?: CodiconRef;
  /** Shown in menus and tooltips and bound as a hotkey. */
  readonly shortcut?: string;
  readonly keywords?: readonly string[];
  /** Reserved for the assistant: listed, never run yet. */
  readonly soon?: boolean;
  /** Whether it can run right now (default: always). */
  enabled?(api: GalleryApi): boolean;
  run(api: GalleryApi): void;
}

/** The items a command acts on: the viewer's photo, else the selection. */
export function targets(api: GalleryApi): readonly MediaItem[] {
  if (api.mode.type === 'view' || api.mode.type === 'edit' || api.mode.type === 'slideshow') {
    const item = api.itemById(api.mode.id);
    return item === undefined ? [] : [item];
  }
  return api.selected;
}

const ids = (api: GalleryApi) => targets(api).map((item) => item.id);
const hasTargets = (api: GalleryApi) => targets(api).length > 0;
const hasOne = (api: GalleryApi) => targets(api).length === 1;
const live = (api: GalleryApi) => hasTargets(api) && api.collection.type !== 'trash';
const browsing = (api: GalleryApi) => api.mode.type === 'browse';

/** Sends a request to a component that owns the focus target (the search box). */
export function requestFocus(target: 'search'): void {
  window.dispatchEvent(new CustomEvent(`gallery:focus-${target}`));
}

const THUMB_SIZES = ['small', 'medium', 'large'] as const;

function zoom(api: GalleryApi, delta: number) {
  const index = THUMB_SIZES.indexOf(api.settings.thumbnailSize);
  const next = THUMB_SIZES[Math.min(THUMB_SIZES.length - 1, Math.max(0, index + delta))];
  if (next !== undefined && next !== api.settings.thumbnailSize) {
    api.updateSetting('thumbnailSize', next);
  }
}

function setView(api: GalleryApi, view: ViewMode) {
  api.setMode({ type: 'browse' });
  if (api.settings.view !== view) api.updateSetting('view', view);
}

const rate = (stars: number): GalleryCommand => ({
  id: `rate-${stars}` as CommandId,
  label: stars === 0 ? 'Clear rating' : `Rate ${stars} star${stars === 1 ? '' : 's'}`,
  group: 'Photo',
  icon: stars === 0 ? 'codicon:star-empty' : 'codicon:star-full',
  shortcut: String(stars),
  enabled: live,
  run: (api) => api.rate(ids(api), stars),
});

const soon = (
  id: CommandId,
  label: string,
  icon: CodiconRef,
  keywords: readonly string[],
): GalleryCommand => ({
  id,
  label,
  group: 'AI',
  icon,
  keywords: ['ai', 'assistant', 'smart', ...keywords],
  soon: true,
  enabled: () => false,
  run: () => undefined,
});

export const COMMANDS: readonly GalleryCommand[] = [
  // Photo
  {
    id: 'open',
    label: 'Open in the viewer',
    group: 'Photo',
    icon: 'codicon:eye',
    shortcut: 'enter',
    enabled: (api) => browsing(api) && hasTargets(api),
    run: (api) => {
      const [first] = targets(api);
      if (first !== undefined) api.openViewer(first.id);
    },
  },
  {
    id: 'edit',
    label: 'Edit a copy',
    group: 'Photo',
    icon: 'codicon:edit',
    shortcut: 'e',
    keywords: ['crop', 'rotate', 'adjust', 'light'],
    enabled: (api) =>
      live(api) &&
      hasOne(api) &&
      targets(api)[0]?.kind === 'image' &&
      targets(api)[0]?.thumbnail === true,
    run: (api) => {
      const [first] = targets(api);
      if (first !== undefined) api.setMode({ type: 'edit', id: first.id });
    },
  },
  {
    id: 'favorite',
    label: 'Favorite',
    group: 'Photo',
    icon: 'codicon:heart',
    shortcut: 'f',
    keywords: ['like', 'love', 'heart'],
    enabled: live,
    run: (api) => {
      const items = targets(api);
      api.favorite(
        items.map((item) => item.id),
        !items.every((item) => item.favorite),
      );
    },
  },
  rate(0),
  rate(1),
  rate(2),
  rate(3),
  rate(4),
  rate(5),
  {
    id: 'rename',
    label: 'Rename…',
    group: 'Photo',
    icon: 'codicon:symbol-string',
    shortcut: 'F2',
    enabled: (api) => live(api) && hasOne(api),
    run: (api) => {
      const [item] = targets(api);
      if (item !== undefined) api.openDialog({ type: 'rename', id: item.id, name: item.name });
    },
  },
  {
    id: 'add-tag',
    label: 'Add a tag…',
    group: 'Photo',
    icon: 'codicon:tag',
    shortcut: 't',
    keywords: ['label', 'keyword'],
    enabled: live,
    run: (api) => api.openDialog({ type: 'add-tag', ids: ids(api) }),
  },
  {
    id: 'new-album',
    label: 'New album…',
    group: 'Photo',
    icon: 'codicon:book',
    shortcut: 'mod+shift+n',
    keywords: ['collection', 'create'],
    run: (api) => api.openDialog({ type: 'new-album', ids: live(api) ? ids(api) : [] }),
  },
  {
    id: 'move',
    label: 'Move to folder…',
    group: 'Photo',
    icon: 'codicon:folder-opened',
    shortcut: 'mod+shift+m',
    enabled: live,
    run: (api) => api.move(ids(api)),
  },
  {
    id: 'copy-to',
    label: 'Copy to folder…',
    group: 'Photo',
    icon: 'codicon:files',
    enabled: live,
    run: (api) => api.copy(ids(api)),
  },
  {
    id: 'export',
    label: 'Export…',
    group: 'Photo',
    icon: 'codicon:export',
    shortcut: 'mod+shift+e',
    keywords: ['resize', 'jpeg', 'png', 'share', 'save'],
    enabled: live,
    run: (api) => api.openDialog({ type: 'export', ids: ids(api) }),
  },
  {
    id: 'trash',
    label: 'Move to Trash',
    group: 'Photo',
    icon: 'codicon:trash',
    shortcut: 'delete',
    keywords: ['delete', 'remove'],
    enabled: live,
    run: (api) => api.trash(ids(api)),
  },
  {
    id: 'restore',
    label: 'Put back',
    group: 'Photo',
    icon: 'codicon:discard',
    keywords: ['restore', 'undelete', 'trash'],
    enabled: (api) =>
      api.context.canRestore && hasTargets(api) && targets(api).every((item) => item.trashed),
    run: (api) => api.restore(ids(api)),
  },
  {
    id: 'open-default',
    label: 'Open in the default app',
    group: 'Photo',
    icon: 'codicon:link-external',
    shortcut: 'mod+o',
    enabled: (api) => live(api) && hasOne(api),
    run: (api) => {
      const [item] = targets(api);
      if (item !== undefined) api.open(item.id);
    },
  },
  {
    id: 'reveal',
    label: 'Show in file manager',
    group: 'Photo',
    icon: 'codicon:folder',
    shortcut: 'mod+shift+r',
    keywords: ['finder', 'explorer', 'folder'],
    enabled: (api) => live(api) && hasOne(api),
    run: (api) => {
      const [item] = targets(api);
      if (item !== undefined) api.reveal(item.id);
    },
  },
  {
    id: 'copy-path',
    label: 'Copy path',
    group: 'Photo',
    icon: 'codicon:copy',
    shortcut: 'mod+shift+c',
    enabled: hasTargets,
    run: (api) =>
      api.copyText(
        targets(api)
          .map((item) => item.path)
          .join('\n'),
        hasOne(api) ? 'the path' : 'the paths',
      ),
  },
  {
    id: 'slideshow',
    label: 'Slideshow',
    group: 'Photo',
    icon: 'codicon:play',
    shortcut: 's',
    enabled: (api) => api.items.length > 0 && api.mode.type !== 'edit',
    run: (api) => {
      const start = targets(api)[0] ?? api.items[0];
      if (start !== undefined) api.setMode({ type: 'slideshow', id: start.id });
    },
  },
  {
    id: 'compare',
    label: 'Compare side by side',
    group: 'Photo',
    icon: 'codicon:split-horizontal',
    shortcut: 'c',
    enabled: (api) => browsing(api) && api.selected.length === 2,
    run: (api) => {
      const [a, b] = api.selected;
      if (a !== undefined && b !== undefined) api.setMode({ type: 'compare', ids: [a.id, b.id] });
    },
  },

  // Edit
  {
    id: 'select-all',
    label: 'Select all',
    group: 'Edit',
    icon: 'codicon:check-all',
    shortcut: 'mod+a',
    enabled: browsing,
    run: (api) => api.select(selectAll(api.items.map((item) => item.id))),
  },
  {
    id: 'invert-selection',
    label: 'Invert selection',
    group: 'Edit',
    icon: 'codicon:arrow-swap',
    shortcut: 'mod+shift+i',
    enabled: browsing,
    run: (api) =>
      api.select(
        invertSelection(
          api.selection,
          api.items.map((item) => item.id),
        ),
      ),
  },
  {
    id: 'undo',
    label: 'Undo',
    group: 'Edit',
    icon: 'codicon:discard',
    shortcut: 'mod+z',
    enabled: (api) => api.undoLabel !== null,
    run: (api) => api.undo(),
  },

  // Library
  {
    id: 'add-folder',
    label: 'Add a folder…',
    group: 'Library',
    icon: 'codicon:new-folder',
    shortcut: 'mod+shift+o',
    keywords: ['import', 'library', 'watch'],
    run: (api) => api.addFolder(),
  },
  {
    id: 'rescan',
    label: 'Rescan library folders',
    group: 'Library',
    icon: 'codicon:refresh',
    shortcut: 'F5',
    keywords: ['refresh', 'reload', 'sync'],
    run: (api) => api.rescan(),
  },
  {
    id: 'duplicates',
    label: 'Find duplicates…',
    group: 'Library',
    icon: 'codicon:copy',
    keywords: ['copies', 'similar', 'clean', 'space'],
    run: (api) => {
      api.openDialog({ type: 'duplicates' });
      // A fresh search each time: earlier results may name files since trashed.
      if (api.duplicates.status !== 'running') api.findDuplicates();
    },
  },

  // View
  {
    id: 'view-timeline',
    label: 'Timeline',
    group: 'View',
    icon: 'codicon:calendar',
    shortcut: 'mod+1',
    run: (api) => setView(api, 'timeline'),
  },
  {
    id: 'view-grid',
    label: 'Grid',
    group: 'View',
    icon: 'codicon:table',
    shortcut: 'mod+2',
    run: (api) => setView(api, 'grid'),
  },
  {
    id: 'view-details',
    label: 'Details',
    group: 'View',
    icon: 'codicon:list-flat',
    shortcut: 'mod+3',
    run: (api) => setView(api, 'details'),
  },
  {
    id: 'zoom-in',
    label: 'Bigger thumbnails',
    group: 'View',
    icon: 'codicon:zoom-in',
    shortcut: 'mod+=',
    enabled: (api) => api.settings.thumbnailSize !== 'large',
    run: (api) => zoom(api, 1),
  },
  {
    id: 'zoom-out',
    label: 'Smaller thumbnails',
    group: 'View',
    icon: 'codicon:zoom-out',
    shortcut: 'mod+-',
    enabled: (api) => api.settings.thumbnailSize !== 'small',
    run: (api) => zoom(api, -1),
  },
  {
    id: 'toggle-videos',
    label: 'Show videos',
    group: 'View',
    icon: 'codicon:device-camera-video',
    run: (api) => api.updateSetting('showVideos', !api.settings.showVideos),
  },
  {
    id: 'toggle-sidebar',
    label: 'Toggle side panel',
    group: 'View',
    icon: 'codicon:layout-sidebar-left',
    shortcut: 'mod+b',
    run: (api) => api.setSidebarOpen(!api.sidebarOpen),
  },
  {
    id: 'toggle-info',
    label: 'Toggle info panel',
    group: 'View',
    icon: 'codicon:info',
    shortcut: 'mod+i',
    run: (api) => api.toggleInfo(),
  },
  {
    id: 'find',
    label: 'Search',
    group: 'View',
    icon: 'codicon:search',
    shortcut: 'mod+f',
    keywords: ['find', 'filter'],
    run: (api) => {
      api.setMode({ type: 'browse' });
      requestFocus('search');
    },
  },
  {
    id: 'settings',
    label: 'Settings',
    group: 'View',
    icon: 'codicon:settings-gear',
    shortcut: 'mod+,',
    keywords: ['preferences', 'options'],
    run: (api) => api.openDialog({ type: 'settings' }),
  },

  // Go
  {
    id: 'go-all',
    label: 'Go to All photos',
    group: 'Go',
    icon: 'codicon:device-camera',
    run: (api) => api.setCollection({ type: 'all' }),
  },
  {
    id: 'go-favorites',
    label: 'Go to Favorites',
    group: 'Go',
    icon: 'codicon:heart',
    run: (api) => api.setCollection({ type: 'favorites' }),
  },
  {
    id: 'go-videos',
    label: 'Go to Videos',
    group: 'Go',
    icon: 'codicon:device-camera-video',
    run: (api) => api.setCollection({ type: 'videos' }),
  },
  {
    id: 'go-trash',
    label: 'Go to Trash',
    group: 'Go',
    icon: 'codicon:trash',
    run: (api) => api.setCollection({ type: 'trash' }),
  },

  // Help
  {
    id: 'palette',
    label: 'Command palette',
    group: 'Help',
    icon: 'codicon:terminal',
    shortcut: 'mod+k',
    run: (api) => api.setPaletteOpen(true),
  },
  {
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    group: 'Help',
    icon: 'codicon:record-keys',
    shortcut: 'F1',
    keywords: ['keys', 'help'],
    run: (api) => api.openDialog({ type: 'shortcuts' }),
  },

  // AI: the assistant and the description search open (as previews); the rest is reserved.
  {
    id: 'ask',
    label: 'Ask about your photos…',
    group: 'AI',
    icon: 'codicon:sparkle',
    shortcut: 'mod+j',
    keywords: ['ai', 'assistant', 'chat'],
    run: (api) => {
      api.setSidebarOpen(true);
      api.setSidePanel('assistant');
    },
  },
  {
    id: 'describe-search',
    label: 'Search by description…',
    group: 'AI',
    icon: 'codicon:search-sparkle',
    keywords: ['ai', 'semantic', 'natural language', 'find'],
    run: (api) => {
      api.setMode({ type: 'browse' });
      api.setSearchMode('describe');
      requestFocus('search');
    },
  },
  soon('describe', 'Describe this photo', 'codicon:comment', ['caption', 'alt text', 'explain']),
  soon('auto-tag', 'Suggest tags', 'codicon:tag', ['label', 'keywords', 'objects']),
  soon('people', 'Find people and pets', 'codicon:person', ['faces', 'names', 'group']),
  soon('memories', 'Make a memory', 'codicon:history', ['story', 'highlights', 'trip']),
  soon('find-alike', 'Find photos like this', 'codicon:search-fuzzy', ['similar', 'related']),
  soon('auto-enhance', 'Auto-enhance', 'codicon:wand', ['fix', 'improve', 'light']),
  soon('remove-background', 'Remove background', 'codicon:layers', ['cut out', 'subject']),
  soon('erase-object', 'Erase an object', 'codicon:clear-all', ['remove', 'inpaint', 'clean']),
  soon('upscale', 'Upscale', 'codicon:screen-full', ['enlarge', 'resolution', 'sharpen']),
  soon('relight', 'Relight', 'codicon:lightbulb', ['shadows', 'lighting', 'portrait']),
];

const BY_ID = new Map(COMMANDS.map((entry) => [entry.id, entry]));

/** The command with this id. */
export function command(id: CommandId): GalleryCommand {
  const found = BY_ID.get(id);
  if (found === undefined) throw new Error(`unknown gallery command ${id}`);
  return found;
}

export function isEnabled(entry: GalleryCommand, api: GalleryApi): boolean {
  return entry.enabled?.(api) ?? true;
}

/** Runs `id` when it is enabled; returns whether it ran. */
export function runCommand(id: CommandId, api: GalleryApi): boolean {
  const entry = command(id);
  if (!isEnabled(entry, api)) return false;
  entry.run(api);
  return true;
}
