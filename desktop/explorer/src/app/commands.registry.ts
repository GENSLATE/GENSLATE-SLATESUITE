/**
 * Every explorer action as a typed command: the palette lists them, the hotkeys run them and
 * the toolbar and menus share their labels, icons and shortcuts. The `ai` group is reserved
 * for the assistant: its commands are listed (so people discover them) but not available yet.
 */
import type { CodiconRef } from '@genslate/design-system';

import { invertSelection, selectAll } from '../model/selection.util';
import type { ExplorerApi } from './explorer.context';

export type CommandGroup = 'File' | 'Edit' | 'Go' | 'View' | 'Tabs' | 'AI' | 'Help';

export type CommandId =
  | 'new-folder'
  | 'new-text-file'
  | 'new-note'
  | 'open-with'
  | 'reveal'
  | 'copy-path'
  | 'rename'
  | 'duplicate'
  | 'trash'
  | 'delete-permanently'
  | 'properties'
  | 'favorite'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'select-all'
  | 'invert-selection'
  | 'undo'
  | 'back'
  | 'forward'
  | 'up'
  | 'home'
  | 'refresh'
  | 'edit-path'
  | 'find'
  | 'view-details'
  | 'view-icons'
  | 'view-tiles'
  | 'toggle-hidden'
  | 'toggle-preview'
  | 'toggle-sidebar'
  | 'settings'
  | 'new-tab'
  | 'close-tab'
  | 'next-tab'
  | 'previous-tab'
  | 'palette'
  | 'ask'
  | 'summarize'
  | 'organize'
  | 'find-similar'
  | 'smart-rename'
  | 'shortcuts';

export interface ExplorerCommand {
  readonly id: CommandId;
  readonly label: string;
  readonly group: CommandGroup;
  readonly icon?: CodiconRef;
  /** Shown in menus and tooltips and bound as a hotkey. */
  readonly shortcut?: string;
  readonly keywords?: readonly string[];
  /**
   * `files`: a file command whose keys also mean something in a text box (Copy, Delete…), so
   * the hotkey stays off while typing. `global` (default): works everywhere.
   */
  readonly scope?: 'global' | 'files';
  /** Reserved for the assistant: listed, never run yet. */
  readonly soon?: boolean;
  /** Whether it can run right now (default: always). */
  enabled?(api: ExplorerApi): boolean;
  run(api: ExplorerApi): void;
}

const hasSelection = (api: ExplorerApi) => api.selected.length > 0;
const hasOne = (api: ExplorerApi) => api.selected.length === 1;
const paths = (api: ExplorerApi) => api.selected.map((entry) => entry.path);
/** Folder commands need a real folder, not search results. */
const inFolder = (api: ExplorerApi) => api.tab.search === null && api.listing?.status !== 'error';

/** Sends a request to a component that owns the focus target (path bar, search box). */
export function requestFocus(target: 'path' | 'search'): void {
  window.dispatchEvent(new CustomEvent(`explorer:focus-${target}`));
}

const soon = (
  id: CommandId,
  label: string,
  icon: CodiconRef,
  keywords: readonly string[],
): ExplorerCommand => ({
  id,
  label,
  group: 'AI',
  icon,
  keywords: ['ai', 'assistant', 'smart', ...keywords],
  soon: true,
  enabled: () => false,
  run: () => undefined,
});

export const COMMANDS: readonly ExplorerCommand[] = [
  // File
  {
    id: 'new-folder',
    label: 'New folder',
    group: 'File',
    icon: 'codicon:new-folder',
    shortcut: 'mod+shift+n',
    enabled: inFolder,
    run: (api) => api.createItem('folder'),
  },
  {
    id: 'new-text-file',
    label: 'New text file',
    group: 'File',
    icon: 'codicon:new-file',
    shortcut: 'mod+alt+n',
    enabled: inFolder,
    run: (api) => api.createItem('text'),
  },
  {
    id: 'new-note',
    label: 'New Markdown note',
    group: 'File',
    icon: 'codicon:markdown',
    enabled: inFolder,
    run: (api) => api.createItem('markdown'),
  },
  {
    id: 'open-with',
    label: 'Open with…',
    group: 'File',
    icon: 'codicon:link-external',
    enabled: (api) => api.context.canOpenWith && hasOne(api) && api.selected[0]?.isDir === false,
    run: (api) => {
      const [entry] = api.selected;
      if (entry !== undefined) api.openWith(entry);
    },
  },
  {
    id: 'reveal',
    label: 'Show in system file manager',
    group: 'File',
    icon: 'codicon:folder-opened',
    keywords: ['reveal', 'finder'],
    run: (api) => api.reveal(api.selected[0]?.path ?? api.tab.path),
  },
  {
    id: 'copy-path',
    label: 'Copy path',
    group: 'File',
    icon: 'codicon:copy',
    shortcut: 'mod+shift+c',
    run: (api) => {
      const list = api.selected.length > 0 ? paths(api) : [api.tab.path];
      api.copyText(list.join('\n'), list.length === 1 ? 'the path' : 'the paths');
    },
  },
  {
    id: 'rename',
    label: 'Rename',
    group: 'File',
    icon: 'codicon:edit',
    shortcut: 'F2',
    scope: 'files',
    enabled: hasOne,
    run: (api) => {
      const [entry] = api.selected;
      if (entry !== undefined) api.startRename(entry.path);
    },
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    group: 'File',
    icon: 'codicon:files',
    shortcut: 'mod+d',
    scope: 'files',
    enabled: hasSelection,
    run: (api) => api.duplicate(paths(api)),
  },
  {
    id: 'trash',
    label: 'Move to Trash',
    group: 'File',
    icon: 'codicon:trash',
    shortcut: 'delete',
    scope: 'files',
    keywords: ['delete', 'remove', 'recycle'],
    enabled: hasSelection,
    run: (api) => api.trash(paths(api)),
  },
  {
    id: 'delete-permanently',
    label: 'Delete permanently…',
    group: 'File',
    icon: 'codicon:close',
    shortcut: 'shift+delete',
    scope: 'files',
    keywords: ['remove', 'erase'],
    enabled: hasSelection,
    run: (api) => api.requestDelete(paths(api)),
  },
  {
    id: 'properties',
    label: 'Properties',
    group: 'File',
    icon: 'codicon:info',
    shortcut: 'alt+enter',
    keywords: ['info', 'details', 'size'],
    run: (api) =>
      api.openDialog({ type: 'properties', path: api.selected[0]?.path ?? api.tab.path }),
  },
  {
    id: 'favorite',
    label: 'Add to / remove from Favorites',
    group: 'File',
    icon: 'codicon:star-empty',
    keywords: ['pin', 'bookmark'],
    run: (api) => {
      const folder = api.selected.find((entry) => entry.isDir)?.path ?? api.tab.path;
      api.toggleFavorite(folder);
    },
  },

  // Edit
  {
    id: 'cut',
    label: 'Cut',
    group: 'Edit',
    icon: 'codicon:clippy',
    shortcut: 'mod+x',
    scope: 'files',
    enabled: hasSelection,
    run: (api) => api.setClipboard('move', paths(api)),
  },
  {
    id: 'copy',
    label: 'Copy',
    group: 'Edit',
    icon: 'codicon:copy',
    shortcut: 'mod+c',
    scope: 'files',
    enabled: hasSelection,
    run: (api) => api.setClipboard('copy', paths(api)),
  },
  {
    id: 'paste',
    label: 'Paste',
    group: 'Edit',
    icon: 'codicon:output',
    shortcut: 'mod+v',
    scope: 'files',
    enabled: (api) => api.clipboard !== null && inFolder(api),
    run: (api) => api.paste(),
  },
  {
    id: 'select-all',
    label: 'Select all',
    group: 'Edit',
    icon: 'codicon:check-all',
    shortcut: 'mod+a',
    scope: 'files',
    run: (api) => api.select(selectAll(api.visible.map((entry) => entry.path))),
  },
  {
    id: 'invert-selection',
    label: 'Invert selection',
    group: 'Edit',
    icon: 'codicon:arrow-swap',
    run: (api) =>
      api.select(
        invertSelection(
          api.tab.selection,
          api.visible.map((entry) => entry.path),
        ),
      ),
  },
  {
    id: 'undo',
    label: 'Undo',
    group: 'Edit',
    icon: 'codicon:discard',
    shortcut: 'mod+z',
    scope: 'files',
    enabled: (api) => api.undoLabel !== null,
    run: (api) => api.undo(),
  },

  // Go
  {
    id: 'back',
    label: 'Back',
    group: 'Go',
    icon: 'codicon:arrow-left',
    shortcut: 'alt+left',
    enabled: (api) => api.tab.back.length > 0,
    run: (api) => api.dispatch({ type: 'back' }),
  },
  {
    id: 'forward',
    label: 'Forward',
    group: 'Go',
    icon: 'codicon:arrow-right',
    shortcut: 'alt+right',
    enabled: (api) => api.tab.forward.length > 0,
    run: (api) => api.dispatch({ type: 'forward' }),
  },
  {
    id: 'up',
    label: 'Up one level',
    group: 'Go',
    icon: 'codicon:arrow-up',
    shortcut: 'alt+up',
    keywords: ['parent'],
    enabled: (api) => api.listing?.listing?.parent != null,
    run: (api) => api.dispatch({ type: 'up' }),
  },
  {
    id: 'home',
    label: 'Home folder',
    group: 'Go',
    icon: 'codicon:home',
    shortcut: 'alt+home',
    enabled: (api) => api.context.home !== null,
    run: (api) => {
      if (api.context.home !== null) api.navigate(api.context.home);
    },
  },
  {
    id: 'refresh',
    label: 'Refresh',
    group: 'Go',
    icon: 'codicon:refresh',
    shortcut: 'F5',
    keywords: ['reload'],
    run: (api) => api.refresh(),
  },
  {
    id: 'edit-path',
    label: 'Go to folder…',
    group: 'Go',
    icon: 'codicon:go-to-file',
    shortcut: 'mod+l',
    keywords: ['path', 'address', 'location'],
    run: () => requestFocus('path'),
  },
  {
    id: 'find',
    label: 'Find in this folder',
    group: 'Go',
    icon: 'codicon:search',
    shortcut: 'mod+f',
    keywords: ['search', 'filter'],
    run: () => requestFocus('search'),
  },

  // View
  {
    id: 'view-details',
    label: 'Details view',
    group: 'View',
    icon: 'codicon:list-flat',
    shortcut: 'mod+1',
    run: (api) => setView(api, 'details'),
  },
  {
    id: 'view-icons',
    label: 'Icons view',
    group: 'View',
    icon: 'codicon:table',
    shortcut: 'mod+2',
    run: (api) => setView(api, 'icons'),
  },
  {
    id: 'view-tiles',
    label: 'Tiles view',
    group: 'View',
    icon: 'codicon:list-unordered',
    shortcut: 'mod+3',
    run: (api) => setView(api, 'tiles'),
  },
  {
    id: 'toggle-hidden',
    label: 'Show / hide hidden files',
    group: 'View',
    icon: 'codicon:eye',
    shortcut: 'mod+h',
    keywords: ['dotfiles'],
    run: (api) => api.updateSetting('showHidden', !api.settings.showHidden),
  },
  {
    id: 'toggle-preview',
    label: 'Show / hide the preview pane',
    group: 'View',
    icon: 'codicon:layout-sidebar-right',
    shortcut: 'alt+p',
    keywords: ['details', 'inspector'],
    run: (api) => api.togglePreview(),
  },
  {
    id: 'toggle-sidebar',
    label: 'Show / hide the side panel',
    group: 'View',
    icon: 'codicon:layout-sidebar-left',
    shortcut: 'mod+b',
    run: (api) => api.setSidebarOpen(!api.sidebarOpen),
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

  // Tabs
  {
    id: 'new-tab',
    label: 'New tab',
    group: 'Tabs',
    icon: 'codicon:add',
    shortcut: 'mod+t',
    run: (api) => api.newTab(api.tab.path),
  },
  {
    id: 'close-tab',
    label: 'Close tab',
    group: 'Tabs',
    icon: 'codicon:close',
    shortcut: 'mod+w',
    enabled: (api) => api.tabs.tabs.length > 1,
    run: (api) => api.dispatch({ type: 'close-tab', id: api.tab.id }),
  },
  {
    id: 'next-tab',
    label: 'Next tab',
    group: 'Tabs',
    icon: 'codicon:chevron-right',
    shortcut: 'ctrl+tab',
    run: (api) => api.dispatch({ type: 'cycle', delta: 1 }),
  },
  {
    id: 'previous-tab',
    label: 'Previous tab',
    group: 'Tabs',
    icon: 'codicon:chevron-left',
    shortcut: 'ctrl+shift+tab',
    run: (api) => api.dispatch({ type: 'cycle', delta: -1 }),
  },
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

  // AI: the chat opens (as a preview); the rest is reserved.
  {
    id: 'ask',
    label: 'Ask about your files…',
    group: 'AI',
    icon: 'codicon:sparkle',
    shortcut: 'mod+j',
    keywords: ['ai', 'assistant', 'chat'],
    run: (api) => {
      api.setSidebarOpen(true);
      api.setSidePanel('chat');
    },
  },
  soon('summarize', 'Summarize the selection', 'codicon:note', ['describe', 'explain']),
  soon('organize', 'Organize this folder', 'codicon:wand', ['sort', 'tidy', 'clean']),
  soon('find-similar', 'Find similar files', 'codicon:search-fuzzy', ['duplicates', 'related']),
  soon('smart-rename', 'Rename with AI', 'codicon:symbol-string', ['name', 'batch']),
];

function setView(api: ExplorerApi, view: ExplorerApi['tab']['view']) {
  api.dispatch({ type: 'view', view });
  // New tabs open in the last view used.
  if (api.settings.view !== view) api.updateSetting('view', view);
}

const BY_ID = new Map(COMMANDS.map((command) => [command.id, command]));

/** The command with this id. */
export function command(id: CommandId): ExplorerCommand {
  const found = BY_ID.get(id);
  if (found === undefined) throw new Error(`unknown explorer command ${id}`);
  return found;
}

export function isEnabled(entry: ExplorerCommand, api: ExplorerApi): boolean {
  return entry.enabled?.(api) ?? true;
}

/** Runs `id` when it is enabled; returns whether it ran. */
export function runCommand(id: CommandId, api: ExplorerApi): boolean {
  const entry = command(id);
  if (!isEnabled(entry, api)) return false;
  entry.run(api);
  return true;
}
