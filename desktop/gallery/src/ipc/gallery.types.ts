/**
 * The shapes the Gallery shell sends and accepts (mirrors `genslate-core-gallery` and
 * `src-tauri/src/commands`). Payloads are checked at the edge by `gallery.parse.ts`.
 */

export type MediaKind = 'image' | 'video';

/** How the viewer shows a file: itself, a rendered stand-in, or only its details. */
export type PreviewMode = 'original' | 'render' | 'none';

/** One photo or video in a list. */
export interface MediaItem {
  readonly id: number;
  readonly path: string;
  readonly name: string;
  readonly kind: MediaKind;
  readonly width: number | null;
  readonly height: number | null;
  /** Date taken, else the file's modification time (ms). */
  readonly date: number;
  /** `false` when `date` is only the file's modification time. */
  readonly dated: boolean;
  readonly size: number;
  readonly favorite: boolean;
  readonly rating: number;
  readonly durationMs: number | null;
  /** Gallery can draw a thumbnail for it. */
  readonly thumbnail: boolean;
  readonly preview: PreviewMode;
  readonly trashed: boolean;
}

export interface Place {
  readonly city: string;
  readonly region: string;
  /** ISO 3166 code ("PT"). */
  readonly country: string;
}

/** Everything the info panel shows. */
export interface MediaDetails extends MediaItem {
  readonly folder: string;
  readonly modifiedAt: number;
  readonly addedAt: number;
  readonly takenAt: number | null;
  readonly orientation: number;
  readonly camera: string | null;
  readonly lens: string | null;
  readonly fNumber: number | null;
  readonly exposure: string | null;
  readonly iso: number | null;
  readonly focalMm: number | null;
  readonly flash: boolean | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly place: Place | null;
  readonly screenshot: boolean;
  readonly editedAt: number | null;
  readonly tags: readonly string[];
  readonly albums: readonly { readonly id: number; readonly name: string }[];
}

/** Which items a view lists. */
export type Collection =
  | { readonly type: 'all' }
  | { readonly type: 'favorites' }
  | { readonly type: 'videos' }
  | { readonly type: 'screenshots' }
  | { readonly type: 'recent' }
  | { readonly type: 'edited' }
  | { readonly type: 'trash' }
  | { readonly type: 'album'; readonly id: number }
  | { readonly type: 'folder'; readonly path: string }
  | { readonly type: 'tag'; readonly name: string }
  | { readonly type: 'place'; readonly country: string; readonly city: string | null };

export type SortKey = 'taken' | 'added' | 'name' | 'size';

/** A list request. */
export interface Query {
  readonly collection: Collection;
  readonly search: string;
  readonly sort: SortKey;
  readonly descending: boolean;
  readonly kind: MediaKind | null;
  readonly favoritesOnly: boolean;
  readonly minRating: number;
  readonly from: number | null;
  readonly to: number | null;
  readonly includeVideos: boolean;
}

export interface Album {
  readonly id: number;
  readonly name: string;
  readonly count: number;
  /** The newest item, shown as the cover. */
  readonly cover: number | null;
  readonly createdAt: number;
}

export interface FolderNode {
  readonly path: string;
  readonly name: string;
  readonly count: number;
  readonly children: readonly FolderNode[];
}

export interface TagCount {
  readonly name: string;
  readonly count: number;
}

export interface PlaceCount extends Place {
  readonly count: number;
  readonly cover: number | null;
}

export interface Counts {
  readonly all: number;
  readonly photos: number;
  readonly videos: number;
  readonly favorites: number;
  readonly screenshots: number;
  readonly recent: number;
  readonly edited: number;
  readonly trash: number;
  readonly bytes: number;
}

/** Everything the side panel lists. */
export interface Summary {
  readonly counts: Counts;
  readonly roots: readonly string[];
  readonly folders: readonly FolderNode[];
  readonly albums: readonly Album[];
  readonly tags: readonly TagCount[];
  readonly places: readonly PlaceCount[];
}

export type ViewMode = 'timeline' | 'grid' | 'details';
export type GroupBy = 'day' | 'month' | 'year';
export type ThumbnailSize = 'small' | 'medium' | 'large';

/** `[gallery]` in config.toml. */
export interface Settings {
  readonly view: ViewMode;
  readonly groupBy: GroupBy;
  readonly sortBy: SortKey;
  readonly sortDescending: boolean;
  readonly thumbnailSize: ThumbnailSize;
  readonly showVideos: boolean;
  readonly includeHidden: boolean;
  readonly confirmTrash: boolean;
  readonly slideshowSeconds: number;
  readonly infoPanel: boolean;
  readonly suggestPictures: boolean;
}

/** The TOML key of each setting. */
export const SETTING_KEYS = {
  view: 'view',
  groupBy: 'group-by',
  sortBy: 'sort-by',
  sortDescending: 'sort-descending',
  thumbnailSize: 'thumbnail-size',
  showVideos: 'show-videos',
  includeHidden: 'include-hidden',
  confirmTrash: 'confirm-trash',
  slideshowSeconds: 'slideshow-seconds',
  infoPanel: 'info-panel',
  suggestPictures: 'suggest-pictures',
} as const satisfies Record<keyof Settings, string>;

/** Everything the UI needs at start. */
export interface GalleryContext {
  readonly settings: Settings;
  /** Trashed items can be put back (Windows and Linux). */
  readonly canRestore: boolean;
  readonly undo: string | null;
  /** The Pictures folder, offered while the library is empty. */
  readonly suggestedFolder: string | null;
  /** Files or folders the app was started with. */
  readonly launch: readonly string[];
}

/** What opening paths found. */
export interface Opened {
  readonly ids: readonly number[];
  readonly folders: readonly string[];
}

/** What a move or copy did. */
export interface TransferOutcome {
  /** `null` when the folder dialog was cancelled. */
  readonly destination: string | null;
  readonly done: number;
  readonly failed: readonly (readonly [string, string])[];
}

export interface ScanProgress {
  readonly folder: string;
  readonly found: number;
  readonly toRead: number;
  readonly read: number;
}

export interface BackendError {
  readonly kind: string;
  readonly message: string;
}

export interface ScanDone {
  readonly added: number;
  readonly updated: number;
  readonly removed: number;
  readonly errors: readonly BackendError[];
}

export interface TaskProgress {
  readonly id: string;
  readonly done: number;
  readonly total: number;
}

export type Likeness = 'exact' | 'similar';

export interface DuplicateGroup {
  readonly likeness: Likeness;
  /** Largest file first. */
  readonly ids: readonly number[];
  /** Bytes freed by keeping only the first. */
  readonly reclaimable: number;
}

export interface DuplicatesDone {
  readonly id: string;
  /** `null` when cancelled. */
  readonly groups: readonly DuplicateGroup[] | null;
  readonly error: BackendError | null;
}

export type ExportFormat = 'original' | 'jpeg' | 'png';

export interface ExportOptions {
  readonly format: ExportFormat;
  /** Longest edge in pixels, `null` for full size. */
  readonly longEdge: number | null;
  /** JPEG quality 1–100. */
  readonly quality: number;
}

export interface ExportDone {
  readonly id: string;
  readonly destination: string;
  readonly written: number;
  readonly failed: readonly (readonly [string, string])[];
  readonly cancelled: boolean;
  readonly error: BackendError | null;
}

/** A crop as fractions of the rotated image. */
export interface Crop {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** What the editor changes (the default changes nothing). */
export interface Recipe {
  /** Clockwise quarter turns, 0–3. */
  readonly quarterTurns: number;
  readonly flipHorizontal: boolean;
  readonly flipVertical: boolean;
  /** Degrees, −45 to 45. */
  readonly straighten: number;
  readonly crop: Crop | null;
  /** Each −1 to 1. */
  readonly light: number;
  readonly contrast: number;
  readonly saturation: number;
  readonly warmth: number;
}

export const EMPTY_RECIPE: Recipe = {
  quarterTurns: 0,
  flipHorizontal: false,
  flipVertical: false,
  straighten: 0,
  crop: null,
  light: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
};

/** Every event the shell sends. */
export interface GalleryEvents {
  libraryChanged(): void;
  scanProgress(progress: ScanProgress): void;
  scanDone(done: ScanDone): void;
  taskProgress(progress: TaskProgress): void;
  duplicatesDone(done: DuplicatesDone): void;
  exportDone(done: ExportDone): void;
  undo(label: string | null): void;
  open(paths: readonly string[]): void;
}
