/** Payloads of the explorer's Rust commands and events (`src-tauri/src/commands`). */

/** `genslate_core_explorer::kind::FileKind`. */
export type FileKind =
  | 'folder'
  | 'image'
  | 'video'
  | 'audio'
  | 'text'
  | 'markdown'
  | 'code'
  | 'data'
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'disk-image'
  | 'executable'
  | 'font'
  | 'other';

/** One file or folder. Times are milliseconds since the Unix epoch. */
export interface Entry {
  readonly name: string;
  readonly path: string;
  readonly isDir: boolean;
  readonly kind: FileKind;
  readonly extension: string | null;
  readonly size: number | null;
  readonly modified: number | null;
  readonly created: number | null;
  readonly hidden: boolean;
  readonly readonly: boolean;
  readonly symlink: boolean;
}

/** A folder's contents. */
export interface Listing {
  readonly path: string;
  readonly name: string;
  readonly parent: string | null;
  readonly entries: readonly Entry[];
  readonly hiddenCount: number;
  readonly skipped: number;
}

export type PlaceId =
  | 'home'
  | 'desktop'
  | 'documents'
  | 'downloads'
  | 'pictures'
  | 'music'
  | 'videos';

export interface Place {
  readonly id: PlaceId;
  readonly label: string;
  readonly path: string;
}

export interface Volume {
  readonly label: string;
  readonly name: string | null;
  readonly path: string;
  readonly totalBytes: number;
  readonly availableBytes: number;
  readonly removable: boolean;
}

export type ViewMode = 'details' | 'icons' | 'tiles';
export type SortKey = 'name' | 'modified' | 'kind' | 'size';

/** `[explorer]` in config.toml. */
export interface Settings {
  readonly view: ViewMode;
  readonly sortBy: SortKey;
  readonly sortDescending: boolean;
  readonly foldersFirst: boolean;
  readonly showHidden: boolean;
  readonly confirmTrash: boolean;
  readonly startFolder: string;
  readonly restoreTabs: boolean;
  readonly previewPane: boolean;
}

/** The config.toml key for each setting. */
export const SETTING_KEYS = {
  view: 'view',
  sortBy: 'sort-by',
  sortDescending: 'sort-descending',
  foldersFirst: 'folders-first',
  showHidden: 'show-hidden',
  confirmTrash: 'confirm-trash',
  startFolder: 'start-folder',
  restoreTabs: 'restore-tabs',
  previewPane: 'preview-pane',
} as const satisfies Record<keyof Settings, string>;

/** Everything the UI needs at start. */
export interface ExplorerContext {
  readonly home: string | null;
  readonly startFolder: string;
  readonly places: readonly Place[];
  readonly volumes: readonly Volume[];
  readonly settings: Settings;
  readonly canRestoreFromTrash: boolean;
  readonly canOpenWith: boolean;
  /** What Undo would reverse next. */
  readonly undo: string | null;
}

export type TransferMode = 'copy' | 'move';
export type ConflictPolicy = 'replace' | 'keep-both' | 'skip';

export interface Progress {
  readonly doneBytes: number;
  readonly totalBytes: number;
  readonly doneItems: number;
  readonly totalItems: number;
  readonly current: string;
}

/** `{ kind, message }`, as every command rejects. */
export interface BackendError {
  readonly kind: string;
  readonly message: string;
}

export interface TaskDone {
  readonly id: string;
  readonly mode: TransferMode;
  readonly done: number;
  readonly skipped: number;
  readonly cancelled: boolean;
  readonly targets: readonly string[];
  readonly error: BackendError | null;
}

export interface TextPreview {
  readonly text: string;
  readonly truncated: boolean;
  readonly binary: boolean;
}

export interface FolderSize {
  readonly bytes: number;
  readonly files: number;
  readonly folders: number;
  readonly cancelled: boolean;
}

export interface Properties {
  readonly entry: Entry;
  readonly accessed: number | null;
  readonly permissions: string;
  readonly linkTarget: string | null;
  readonly children: number | null;
}

export interface SearchQuery {
  readonly root: string;
  readonly text: string;
  readonly contents: boolean;
  readonly showHidden: boolean;
}

export interface SearchSummary {
  readonly scanned: number;
  readonly matched: number;
  readonly truncated: boolean;
  readonly cancelled: boolean;
}

export interface SearchDone {
  readonly id: string;
  readonly summary: SearchSummary | null;
  readonly error: BackendError | null;
}

/** Events the shell sends. */
export interface ExplorerEvents {
  progress(id: string, progress: Progress): void;
  taskDone(done: TaskDone): void;
  searchResults(id: string, entries: readonly Entry[]): void;
  searchDone(done: SearchDone): void;
  /** Watched folders changed on disk. */
  changed(folders: readonly string[]): void;
  /** The Undo stack changed. */
  undo(label: string | null): void;
}
