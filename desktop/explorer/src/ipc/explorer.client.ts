/**
 * The explorer backend: typed calls into `src-tauri/src/commands` through
 * `@genslate/tauri-bridge`, or an in-memory file system when the UI runs in a plain browser
 * (`bun x moon run explorer:web-dev`) so it can be designed and screenshot anywhere.
 */
import { customSchemeUrl, invokeCommand, isTauri, listenEvent } from '@genslate/tauri-bridge';

import { createMockBackend } from './explorer.mock';
import {
  parseContext,
  parseEntries,
  parseEntry,
  parseFolderSize,
  parseListing,
  parseProperties,
  parseSettings,
  parseStrings,
  parseTextPreview,
  parseVolumes,
} from './explorer.parse';
import type {
  ConflictPolicy,
  Entry,
  ExplorerContext,
  ExplorerEvents,
  FolderSize,
  Listing,
  Progress,
  Properties,
  SearchDone,
  SearchQuery,
  Settings,
  TaskDone,
  TextPreview,
  TransferMode,
  Volume,
} from './explorer.types';
import { SETTING_KEYS } from './explorer.types';

/** Everything the UI can ask of the shell. */
export interface ExplorerBackend {
  context(): Promise<ExplorerContext>;
  volumes(): Promise<readonly Volume[]>;
  listDir(path: string, showHidden: boolean): Promise<Listing>;
  createFolder(parent: string, name: string): Promise<Entry>;
  createFile(parent: string, name: string): Promise<Entry>;
  rename(path: string, newName: string): Promise<Entry>;
  trash(paths: readonly string[]): Promise<void>;
  deletePermanently(paths: readonly string[]): Promise<void>;
  /** Reverses the newest operation; resolves to what was undone (`null`: nothing to undo). */
  undo(): Promise<string | null>;
  readText(path: string): Promise<TextPreview>;
  properties(path: string): Promise<Properties>;
  openPath(path: string): Promise<void>;
  openWith(path: string): Promise<void>;
  reveal(path: string): Promise<void>;
  watch(folders: readonly string[]): Promise<void>;
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<Settings>;
  findConflicts(sources: readonly string[], destination: string): Promise<readonly string[]>;
  /** Starts a copy/move; its progress and result arrive as `progress` / `taskDone` events. */
  startTransfer(
    id: string,
    mode: TransferMode,
    sources: readonly string[],
    destination: string,
    policy: ConflictPolicy,
  ): Promise<void>;
  /** Starts a search; matches arrive as `searchResults`, the end as `searchDone`. */
  startSearch(id: string, query: SearchQuery): Promise<void>;
  folderSize(id: string, path: string): Promise<FolderSize>;
  cancelTask(id: string): Promise<void>;
  /** URL the preview pane loads a file from (images, audio, video). */
  previewUrl(path: string): string;
  /** Subscribes to every event; resolves to an unsubscribe function. */
  subscribe(events: ExplorerEvents): Promise<() => void>;
}

function createTauriBackend(): ExplorerBackend {
  return {
    context: async () => parseContext(await invokeCommand('get_context')),
    volumes: async () => parseVolumes(await invokeCommand('get_volumes')),
    listDir: async (path, showHidden) =>
      parseListing(await invokeCommand('list_dir', { path, showHidden })),
    createFolder: async (parent, name) =>
      parseEntry(await invokeCommand('create_folder', { parent, name })),
    createFile: async (parent, name) =>
      parseEntry(await invokeCommand('create_file', { parent, name })),
    rename: async (path, newName) => parseEntry(await invokeCommand('rename', { path, newName })),
    trash: (paths) => invokeCommand('trash', { paths }),
    deletePermanently: (paths) => invokeCommand('delete_permanently', { paths }),
    undo: async () => {
      const label = await invokeCommand<unknown>('undo');
      return typeof label === 'string' ? label : null;
    },
    readText: async (path) => parseTextPreview(await invokeCommand('read_text', { path })),
    properties: async (path) => parseProperties(await invokeCommand('get_properties', { path })),
    openPath: (path) => invokeCommand('open_path', { path }),
    openWith: (path) => invokeCommand('open_with', { path }),
    reveal: (path) => invokeCommand('reveal_path', { path }),
    watch: (paths) => invokeCommand('watch_folders', { paths }),
    setSetting: async (key, value) =>
      parseSettings(await invokeCommand('set_setting', { key: SETTING_KEYS[key], value })),
    findConflicts: async (sources, destination) =>
      parseStrings(await invokeCommand('find_conflicts', { sources, destination }), 'conflicts'),
    startTransfer: (id, mode, sources, destination, policy) =>
      invokeCommand('start_transfer', { id, mode, sources, destination, policy }),
    startSearch: (id, query) => invokeCommand('start_search', { id, query }),
    folderSize: async (id, path) =>
      parseFolderSize(await invokeCommand('folder_size', { id, path })),
    cancelTask: (id) => invokeCommand('cancel_task', { id }),
    previewUrl: (path) => customSchemeUrl('explorer-file', [path]),
    subscribe: async (events) => {
      const unsubscribers = await Promise.all([
        listenEvent<{ id: string; progress: Progress }>('explorer://progress', (payload) =>
          events.progress(payload.id, payload.progress),
        ),
        listenEvent<TaskDone>('explorer://task-done', events.taskDone),
        listenEvent<{ id: string; entries: unknown }>('explorer://search-results', (payload) =>
          events.searchResults(payload.id, parseEntries(payload.entries)),
        ),
        listenEvent<SearchDone>('explorer://search-done', events.searchDone),
        listenEvent<unknown>('explorer://changed', (payload) =>
          events.changed(parseStrings(payload, 'changed folders')),
        ),
        listenEvent<unknown>('explorer://undo', (payload) =>
          events.undo(typeof payload === 'string' ? payload : null),
        ),
      ]);
      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    },
  };
}

/** The real backend in the desktop app, the in-memory one in a browser. */
export function createBackend(): ExplorerBackend {
  return isTauri() ? createTauriBackend() : createMockBackend();
}
