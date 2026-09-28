import { createContext, use } from 'react';

import type { ExplorerBackend } from '../ipc/explorer.client';
import type {
  ConflictPolicy,
  Entry,
  ExplorerContext,
  Progress,
  Settings,
  TransferMode,
} from '../ipc/explorer.types';
import type { Selection } from '../model/selection.util';
import type { Tab, TabsAction, TabsState } from '../model/tabs.reducer';
import type { ListingState } from './listing.store';

/** The side panel's tabs. `git`, `chat` and `smart` are previews of what is coming. */
export type SidePanelId = 'files' | 'git' | 'chat' | 'smart';

/** Items waiting to be pasted. */
export interface Clipboard {
  readonly mode: TransferMode;
  readonly paths: readonly string[];
}

/** A running copy or move. */
export interface TransferTask {
  readonly id: string;
  readonly mode: TransferMode;
  readonly count: number;
  readonly destination: string;
  readonly progress: Progress | null;
}

/** The dialog on screen, if any. */
export type DialogState =
  | { readonly type: 'none' }
  | {
      readonly type: 'conflict';
      readonly mode: TransferMode;
      readonly sources: readonly string[];
      readonly destination: string;
      readonly names: readonly string[];
    }
  | { readonly type: 'delete'; readonly paths: readonly string[] }
  | { readonly type: 'trash'; readonly paths: readonly string[] }
  | { readonly type: 'properties'; readonly path: string }
  | { readonly type: 'settings' }
  | { readonly type: 'shortcuts' };

export type NewItemKind = 'folder' | 'text' | 'markdown';

/** Everything the explorer's components read and do. */
export interface ExplorerApi {
  readonly backend: ExplorerBackend;
  readonly context: ExplorerContext;
  readonly settings: Settings;
  updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;

  readonly tabs: TabsState;
  readonly tab: Tab;
  dispatch(action: TabsAction): void;
  /** The active tab's folder. */
  readonly listing: ListingState | undefined;
  listingOf(path: string): ListingState | undefined;
  loadFolder(path: string): void;
  refresh(): void;
  /** What the file view shows: the folder (sorted, filtered) or the search results. */
  readonly visible: readonly Entry[];
  readonly selected: readonly Entry[];
  select(selection: Selection): void;

  navigate(path: string, select?: readonly string[]): void;
  newTab(path: string, activate?: boolean): void;
  open(entry: Entry): void;
  openWith(entry: Entry): void;
  reveal(path: string): void;

  readonly clipboard: Clipboard | null;
  setClipboard(mode: TransferMode, paths: readonly string[]): void;
  paste(destination?: string): void;
  transfer(
    mode: TransferMode,
    sources: readonly string[],
    destination: string,
    policy?: ConflictPolicy,
  ): void;
  readonly tasks: readonly TransferTask[];
  cancelTask(id: string): void;

  /** The path being renamed inline. */
  readonly renaming: string | null;
  startRename(path: string): void;
  commitRename(path: string, name: string): void;
  cancelRename(): void;
  createItem(kind: NewItemKind): void;
  duplicate(paths: readonly string[]): void;
  /** Moves to the Trash, asking first when `confirm-trash` is on (unless `confirmed`). */
  trash(paths: readonly string[], confirmed?: boolean): void;
  requestDelete(paths: readonly string[]): void;
  deletePermanently(paths: readonly string[]): void;
  undo(): void;
  readonly undoLabel: string | null;
  copyText(text: string, what: string): void;

  search(text: string, contents: boolean): void;
  clearSearch(): void;

  readonly favorites: readonly string[];
  toggleFavorite(path: string): void;

  readonly dialog: DialogState;
  openDialog(dialog: DialogState): void;
  closeDialog(): void;
  readonly paletteOpen: boolean;
  setPaletteOpen(open: boolean): void;
  readonly previewOpen: boolean;
  togglePreview(): void;
  readonly sidePanel: SidePanelId;
  setSidePanel(panel: SidePanelId): void;
  readonly sidebarOpen: boolean;
  setSidebarOpen(open: boolean): void;
  /** Reports a failed action as an error toast. */
  report(title: string, error: unknown): void;
}

export const ExplorerApiContext = createContext<ExplorerApi | null>(null);

/** The explorer state and actions (inside `ExplorerProvider`). */
export function useExplorer(): ExplorerApi {
  const api = use(ExplorerApiContext);
  if (api === null) throw new Error('useExplorer() must be used inside <ExplorerProvider>');
  return api;
}
