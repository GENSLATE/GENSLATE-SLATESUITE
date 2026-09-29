import { createContext, use } from 'react';

import type { FinishedCommand, PaneStore } from '../engine/pane-store';
import type { TerminalSession } from '../engine/terminal-session';
import type { TerminalBackend } from '../ipc/terminal.client';
import type {
  Profile,
  ProfileColor,
  Settings,
  Snippet,
  SnippetDraft,
  TerminalContext,
} from '../ipc/terminal.types';
import type { LayoutAction, LayoutState, TabState } from '../model/layout.reducer';
import type { SplitDirection } from '../model/pane-tree.util';
import type { PasteReview } from '../model/paste.util';

/** The side panel's tabs. `assistant` and `workflows` are previews of what is coming. */
export type SidePanelId = 'files' | 'sessions' | 'snippets' | 'history' | 'assistant' | 'workflows';

/** The dialog on screen, if any. */
export type DialogState =
  | { readonly type: 'none' }
  | { readonly type: 'settings' }
  | { readonly type: 'shortcuts' }
  | { readonly type: 'snippet'; readonly snippet: SnippetDraft }
  | { readonly type: 'rename-tab'; readonly tabId: string }
  | { readonly type: 'clear-history' }
  | {
      readonly type: 'paste';
      readonly paneId: string;
      readonly text: string;
      readonly review: PasteReview;
    }
  | {
      readonly type: 'close';
      readonly target: { readonly kind: 'pane' | 'tab'; readonly id: string };
      /** What is still running in there. */
      readonly running: readonly string[];
    };

/** What the assistant preview is looking at (a failed command, the active pane). */
export interface AssistantFocus {
  readonly paneId: string;
  readonly command: FinishedCommand | null;
}

/** Everything the terminal's components read and do. */
export interface TerminalApi {
  readonly backend: TerminalBackend;
  readonly context: TerminalContext;
  readonly profiles: readonly Profile[];
  profile(id: string): Profile;
  readonly defaultProfileId: string;
  readonly settings: Settings;
  updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;

  readonly layout: LayoutState;
  readonly tab: TabState | null;
  dispatch(action: LayoutAction): void;
  readonly store: PaneStore;
  /** The pane that has (or last had) the focus in the active tab. */
  readonly activePaneId: string | null;
  session(paneId: string): TerminalSession | undefined;
  /** Mounts a pane's terminal in `container` (starting its shell the first time). */
  attachPane(paneId: string, container: HTMLElement): void;
  detachPane(paneId: string, container: HTMLElement): void;

  newTab(options?: { readonly profileId?: string; readonly cwd?: string | null }): void;
  duplicateTab(tabId?: string): void;
  split(
    direction: SplitDirection,
    options?: { readonly profileId?: string; readonly cwd?: string },
  ): void;
  /** Closes a pane, asking first when a program is still running (unless `confirmed`). */
  closePane(paneId: string, confirmed?: boolean): void;
  closeTab(tabId: string, confirmed?: boolean): void;
  focusPane(paneId: string): void;
  restartPane(paneId: string): void;
  setTabColor(tabId: string, color: ProfileColor | null): void;

  /** Types text into a pane (`run`: then presses Enter). */
  sendText(text: string, options?: { readonly paneId?: string; readonly run?: boolean }): void;
  /** Pastes into a pane, reviewing risky pastes first. */
  paste(text: string, paneId?: string, reviewed?: boolean): void;
  pasteFromClipboard(): void;
  copySelection(): void;
  copyText(text: string, what: string): void;
  /** Types a path, quoted (and translated for WSL) for the active pane's shell. */
  insertPath(path: string): void;
  /** Changes the active pane's folder (`cd`), or opens a tab there when it is busy. */
  changeFolder(path: string): void;
  clearPane(): void;
  saveOutput(): void;
  openPath(path: string): void;
  revealPath(path: string): void;
  openUrl(url: string): void;
  zoomFont(delta: number | 'reset'): void;

  readonly snippets: readonly Snippet[];
  saveSnippet(snippet: SnippetDraft): Promise<boolean>;
  deleteSnippet(id: string): void;
  /** Changes each time a command finishes or history is edited (the History panel refetches). */
  readonly historyVersion: number;
  deleteHistory(id: number): void;
  clearHistory(): void;
  /** Changes when watched folders change on disk (the Files panel refetches them). */
  readonly changedFolders: { readonly version: number; readonly folders: readonly string[] };

  readonly findOpen: boolean;
  setFindOpen(open: boolean): void;
  readonly dialog: DialogState;
  openDialog(dialog: DialogState): void;
  closeDialog(): void;
  readonly paletteOpen: boolean;
  setPaletteOpen(open: boolean): void;
  readonly sidePanel: SidePanelId;
  setSidePanel(panel: SidePanelId): void;
  readonly sidebarOpen: boolean;
  setSidebarOpen(open: boolean): void;
  /** The natural-language command bar (a preview), open over this pane. */
  readonly commandBarPane: string | null;
  setCommandBarPane(paneId: string | null): void;
  readonly assistantFocus: AssistantFocus | null;
  askAssistant(focus?: AssistantFocus): void;
  /** Switches between Polar Night and Snow Storm. */
  toggleTheme(): void;
  /** Tells the user something went wrong (a toast). */
  report(title: string, error: unknown): void;
}

export const TerminalApiContext = createContext<TerminalApi | null>(null);

export function useTerminal(): TerminalApi {
  const api = use(TerminalApiContext);
  if (api === null) throw new Error('useTerminal() needs a <TerminalProvider>');
  return api;
}
