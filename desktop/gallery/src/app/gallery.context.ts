import { createContext, use } from 'react';

import type { GalleryBackend } from '../ipc/gallery.client';
import type {
  Collection,
  DuplicateGroup,
  ExportOptions,
  GalleryContext,
  MediaItem,
  MediaKind,
  Recipe,
  ScanProgress,
  Settings,
  Summary,
} from '../ipc/gallery.types';
import type { Selection } from '../model/selection.util';

/** The side panel's tabs. `people`, `memories` and `assistant` are previews of what is coming. */
export type SidePanelId = 'library' | 'folders' | 'places' | 'people' | 'memories' | 'assistant';

/** How the search box searches: words (file names, places, tags…) or, soon, a description. */
export type SearchMode = 'words' | 'describe';

/** What the main area shows. */
export type Mode =
  | { readonly type: 'browse' }
  | { readonly type: 'view'; readonly id: number }
  | { readonly type: 'edit'; readonly id: number }
  | { readonly type: 'compare'; readonly ids: readonly [number, number] }
  | { readonly type: 'slideshow'; readonly id: number };

/** Narrowing on top of the collection. */
export interface Filters {
  readonly favoritesOnly: boolean;
  readonly minRating: number;
  readonly kind: MediaKind | null;
}

export const NO_FILTERS: Filters = { favoritesOnly: false, minRating: 0, kind: null };

/** A running duplicate search or export. */
export interface Task {
  readonly id: string;
  readonly kind: 'duplicates' | 'export';
  readonly label: string;
  readonly done: number;
  readonly total: number;
}

export type DuplicatesState =
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly id: string }
  | { readonly status: 'done'; readonly groups: readonly DuplicateGroup[] };

/** The dialog on screen, if any. */
export type DialogState =
  | { readonly type: 'none' }
  | { readonly type: 'settings' }
  | { readonly type: 'shortcuts' }
  | { readonly type: 'trash'; readonly ids: readonly number[] }
  | { readonly type: 'forget'; readonly ids: readonly number[] }
  | { readonly type: 'remove-folder'; readonly path: string }
  | { readonly type: 'delete-album'; readonly id: number; readonly name: string }
  | { readonly type: 'new-album'; readonly ids: readonly number[] }
  | { readonly type: 'rename-album'; readonly id: number; readonly name: string }
  | { readonly type: 'rename'; readonly id: number; readonly name: string }
  | { readonly type: 'add-tag'; readonly ids: readonly number[] }
  | { readonly type: 'export'; readonly ids: readonly number[] }
  | { readonly type: 'duplicates' };

/** Everything Gallery's components read and do. */
export interface GalleryApi {
  readonly backend: GalleryBackend;
  readonly context: GalleryContext;
  readonly settings: Settings;
  updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;

  readonly summary: Summary | null;
  readonly collection: Collection;
  setCollection(collection: Collection): void;
  readonly search: string;
  setSearch(text: string): void;
  readonly searchMode: SearchMode;
  setSearchMode(mode: SearchMode): void;
  readonly filters: Filters;
  setFilters(filters: Filters): void;
  /** What the view lists (collection, search and filters applied). */
  readonly items: readonly MediaItem[];
  readonly loading: boolean;
  /** Bumped whenever the library changes (details reload on it). */
  readonly revision: number;
  itemById(id: number): MediaItem | undefined;
  readonly scan: ScanProgress | null;

  readonly selection: Selection;
  select(selection: Selection): void;
  readonly selected: readonly MediaItem[];
  /** The item the info panel describes: the one open in the viewer, else the focused one. */
  readonly current: MediaItem | null;

  readonly mode: Mode;
  setMode(mode: Mode): void;
  openViewer(id: number): void;

  favorite(ids: readonly number[], favorite: boolean): void;
  rate(ids: readonly number[], rating: number): void;
  addTag(ids: readonly number[], name: string): void;
  removeTag(ids: readonly number[], name: string): void;
  createAlbum(name: string, ids: readonly number[]): void;
  renameAlbum(id: number, name: string): void;
  deleteAlbum(id: number): void;
  addToAlbum(album: number, ids: readonly number[]): void;
  removeFromAlbum(album: number, ids: readonly number[]): void;
  rename(id: number, name: string): void;
  move(ids: readonly number[]): void;
  copy(ids: readonly number[]): void;
  /** Moves to the Trash, asking first when `confirm-trash` is on (unless `confirmed`). */
  trash(ids: readonly number[], confirmed?: boolean): void;
  restore(ids: readonly number[]): void;
  forget(ids: readonly number[]): void;
  undo(): void;
  readonly undoLabel: string | null;
  open(id: number): void;
  reveal(id: number): void;
  saveEdit(id: number, recipe: Recipe): Promise<boolean>;
  copyText(text: string, what: string): void;

  addFolder(): void;
  addFolderPath(path: string): void;
  removeFolder(path: string): void;
  rescan(): void;

  readonly tasks: readonly Task[];
  cancelTask(id: string): void;
  exportItems(ids: readonly number[], options: ExportOptions): void;
  readonly duplicates: DuplicatesState;
  findDuplicates(): void;

  readonly dialog: DialogState;
  openDialog(dialog: DialogState): void;
  closeDialog(): void;
  readonly paletteOpen: boolean;
  setPaletteOpen(open: boolean): void;
  readonly infoOpen: boolean;
  toggleInfo(): void;
  readonly sidePanel: SidePanelId;
  setSidePanel(panel: SidePanelId): void;
  readonly sidebarOpen: boolean;
  setSidebarOpen(open: boolean): void;
  /** Reports a failed action as an error toast. */
  report(title: string, error: unknown): void;
}

export const GalleryApiContext = createContext<GalleryApi | null>(null);

/** The gallery state and actions (inside `GalleryProvider`). */
export function useGallery(): GalleryApi {
  const api = use(GalleryApiContext);
  if (api === null) throw new Error('useGallery() must be used inside <GalleryProvider>');
  return api;
}
