/**
 * The gallery backend: typed calls into `src-tauri/src/commands` through
 * `@genslate/tauri-bridge`, or an in-memory sample library when the UI runs in a plain
 * browser (`bun x moon run gallery:web-dev`) so it can be designed and screenshot anywhere.
 */
import { customSchemeUrl, invokeCommand, isTauri, listenEvent } from '@genslate/tauri-bridge';

import { createMockBackend } from './gallery.mock';
import {
  parseAlbum,
  parseContext,
  parseDetails,
  parseItem,
  parseItems,
  parseOpened,
  parseSettings,
  parseSummary,
  parseTransfer,
} from './gallery.parse';
import type {
  Album,
  DuplicatesDone,
  ExportDone,
  ExportOptions,
  GalleryContext,
  GalleryEvents,
  MediaDetails,
  MediaItem,
  Opened,
  Query,
  Recipe,
  ScanDone,
  ScanProgress,
  Settings,
  Summary,
  TaskProgress,
  TransferOutcome,
} from './gallery.types';
import { SETTING_KEYS } from './gallery.types';

/** Thumbnail edges the shell renders. */
export const THUMB_EDGE = 512;
export const DISPLAY_EDGE = 2560;

/** Everything the UI can ask of the shell. */
export interface GalleryBackend {
  context(): Promise<GalleryContext>;
  summary(): Promise<Summary>;
  query(query: Query): Promise<readonly MediaItem[]>;
  details(id: number): Promise<MediaDetails>;
  /** Asks for a folder and adds it; `null` when cancelled. */
  addFolder(): Promise<string | null>;
  addFolderPath(path: string): Promise<string>;
  removeFolder(path: string): Promise<number>;
  rescan(): Promise<void>;
  openPaths(paths: readonly string[]): Promise<Opened>;
  setFavorite(ids: readonly number[], favorite: boolean): Promise<void>;
  setRating(ids: readonly number[], rating: number): Promise<void>;
  addTag(ids: readonly number[], name: string): Promise<string>;
  removeTag(ids: readonly number[], name: string): Promise<void>;
  createAlbum(name: string, ids: readonly number[]): Promise<Album>;
  renameAlbum(id: number, name: string): Promise<void>;
  deleteAlbum(id: number): Promise<void>;
  addToAlbum(album: number, ids: readonly number[]): Promise<number>;
  removeFromAlbum(album: number, ids: readonly number[]): Promise<void>;
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<Settings>;
  rename(id: number, newName: string): Promise<MediaItem>;
  /** `destination` `null` asks for a folder. */
  move(ids: readonly number[], destination: string | null): Promise<TransferOutcome>;
  copy(ids: readonly number[], destination: string | null): Promise<TransferOutcome>;
  trash(ids: readonly number[]): Promise<number>;
  restore(ids: readonly number[]): Promise<number>;
  forget(ids: readonly number[]): Promise<void>;
  /** Reverses the newest operation; resolves to what Undo would reverse next. */
  undo(): Promise<string | null>;
  open(id: number): Promise<void>;
  reveal(id: number): Promise<void>;
  saveEdit(id: number, recipe: Recipe): Promise<MediaItem>;
  /** Starts the duplicate finder; progress and result arrive as events. */
  findDuplicates(id: string): Promise<void>;
  /** Starts an export; resolves to the folder (`null`: cancelled). */
  exportMedia(
    id: string,
    ids: readonly number[],
    options: ExportOptions,
    destination: string | null,
  ): Promise<string | null>;
  cancelTask(id: string): Promise<void>;
  /** A thumbnail (`THUMB_EDGE`) or large render (`DISPLAY_EDGE`). */
  thumbUrl(item: MediaItem, edge: number): string;
  /** The original file (images the webview can show, videos). */
  mediaUrl(item: MediaItem): string;
  /** A still for a video, when the backend has one (else the tile seeks the video itself). */
  videoPoster(item: MediaItem): string | null;
  /** Subscribes to every event; resolves to an unsubscribe function. */
  subscribe(events: GalleryEvents): Promise<() => void>;
}

/** Changes whenever the file does, so the webview never shows a stale thumbnail. */
function version(item: MediaItem): string {
  return `?v=${item.size.toString(36)}-${item.date.toString(36)}`;
}

function createTauriBackend(): GalleryBackend {
  return {
    context: async () => parseContext(await invokeCommand('get_context')),
    summary: async () => parseSummary(await invokeCommand('get_summary')),
    query: async (query) => parseItems(await invokeCommand('query_media', { query })),
    details: async (id) => parseDetails(await invokeCommand('get_details', { id })),
    addFolder: async () => {
      const folder = await invokeCommand<unknown>('add_folder');
      return typeof folder === 'string' ? folder : null;
    },
    addFolderPath: async (path) => String(await invokeCommand('add_folder_path', { path })),
    removeFolder: async (path) => Number(await invokeCommand('remove_folder', { path })),
    rescan: () => invokeCommand('rescan'),
    openPaths: async (paths) => parseOpened(await invokeCommand('open_paths', { paths })),
    setFavorite: (ids, favorite) => invokeCommand('set_favorite', { ids, favorite }),
    setRating: (ids, rating) => invokeCommand('set_rating', { ids, rating }),
    addTag: async (ids, name) => String(await invokeCommand('add_tag', { ids, name })),
    removeTag: (ids, name) => invokeCommand('remove_tag', { ids, name }),
    createAlbum: async (name, ids) =>
      parseAlbum(await invokeCommand('create_album', { name, ids })),
    renameAlbum: (id, name) => invokeCommand('rename_album', { id, name }),
    deleteAlbum: (id) => invokeCommand('delete_album', { id }),
    addToAlbum: async (album, ids) => Number(await invokeCommand('add_to_album', { album, ids })),
    removeFromAlbum: (album, ids) => invokeCommand('remove_from_album', { album, ids }),
    setSetting: async (key, value) =>
      parseSettings(await invokeCommand('set_setting', { key: SETTING_KEYS[key], value })),
    rename: async (id, newName) => parseItem(await invokeCommand('rename_media', { id, newName })),
    move: async (ids, destination) =>
      parseTransfer(await invokeCommand('move_media', { ids, destination })),
    copy: async (ids, destination) =>
      parseTransfer(await invokeCommand('copy_media', { ids, destination })),
    trash: async (ids) => Number(await invokeCommand('trash_media', { ids })),
    restore: async (ids) => Number(await invokeCommand('restore_media', { ids })),
    forget: (ids) => invokeCommand('forget_media', { ids }),
    undo: async () => {
      const label = await invokeCommand<unknown>('undo');
      return typeof label === 'string' ? label : null;
    },
    open: (id) => invokeCommand('open_media', { id }),
    reveal: (id) => invokeCommand('reveal_media', { id }),
    saveEdit: async (id, recipe) => parseItem(await invokeCommand('save_edit', { id, recipe })),
    findDuplicates: (id) => invokeCommand('find_duplicates', { id }),
    exportMedia: async (id, ids, options, destination) => {
      const folder = await invokeCommand<unknown>('export_media', {
        id,
        ids,
        options,
        destination,
      });
      return typeof folder === 'string' ? folder : null;
    },
    cancelTask: (id) => invokeCommand('cancel_task', { id }),
    thumbUrl: (item, edge) =>
      customSchemeUrl('gallery-thumb', [String(edge), String(item.id)]) + version(item),
    mediaUrl: (item) => customSchemeUrl('gallery-media', [String(item.id)]) + version(item),
    videoPoster: () => null,
    subscribe: async (events) => {
      const unsubscribers = await Promise.all([
        listenEvent<unknown>('gallery://library-changed', () => events.libraryChanged()),
        listenEvent<ScanProgress>('gallery://scan-progress', events.scanProgress),
        listenEvent<ScanDone>('gallery://scan-done', events.scanDone),
        listenEvent<TaskProgress>('gallery://task-progress', events.taskProgress),
        listenEvent<DuplicatesDone>('gallery://duplicates-done', events.duplicatesDone),
        listenEvent<ExportDone>('gallery://export-done', events.exportDone),
        listenEvent<unknown>('gallery://undo', (payload) =>
          events.undo(typeof payload === 'string' ? payload : null),
        ),
        listenEvent<{ paths: readonly string[] }>('gallery://open', (payload) =>
          events.open(payload.paths),
        ),
      ]);
      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    },
  };
}

/** The real backend in the desktop app, the sample library in a browser. */
export function createBackend(): GalleryBackend {
  return isTauri() ? createTauriBackend() : createMockBackend();
}
