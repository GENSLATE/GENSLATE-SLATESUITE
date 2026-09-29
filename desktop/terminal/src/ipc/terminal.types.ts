/**
 * The terminal's IPC payloads, mirroring `desktop/terminal/src-tauri/src/commands`. Parsed at
 * the boundary by `terminal.parse.ts`.
 */

export type HostPlatform = 'windows' | 'macos' | 'linux';

export type ProfileIcon =
  | 'powershell'
  | 'cmd'
  | 'linux'
  | 'ubuntu'
  | 'debian'
  | 'bash'
  | 'zsh'
  | 'fish'
  | 'nu'
  | 'git'
  | 'vs'
  | 'terminal';

export type ShellKind =
  | 'pwsh'
  | 'powershell'
  | 'cmd'
  | 'bash'
  | 'zsh'
  | 'fish'
  | 'nu'
  | 'sh'
  | 'wsl'
  | 'other';

/** A Nord accent a profile or tab can wear. */
export type ProfileColor =
  | 'frost'
  | 'aurora-red'
  | 'aurora-orange'
  | 'aurora-yellow'
  | 'aurora-green'
  | 'aurora-purple';

/** A shell the terminal can start: detected on this machine or configured in config.toml. */
export interface Profile {
  readonly id: string;
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string | null;
  readonly icon: ProfileIcon;
  readonly color: ProfileColor | null;
  readonly kind: ShellKind;
  readonly source: 'detected' | 'config';
}

export type CursorStyle = 'block' | 'bar' | 'underline';

/** `[terminal]` in config.toml. */
export interface Settings {
  readonly defaultProfile: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly cursorStyle: CursorStyle;
  readonly cursorBlink: boolean;
  readonly scrollback: number;
  readonly copyOnSelect: boolean;
  readonly rightClick: 'menu' | 'paste';
  readonly pasteWarning: boolean;
  readonly bell: 'visual' | 'none';
  readonly shellIntegration: boolean;
  readonly restoreSession: boolean;
  readonly notifyWhenDone: boolean;
  readonly confirmClose: boolean;
  readonly history: boolean;
}

/** Each setting's key in config.toml. */
export const SETTING_KEYS = {
  defaultProfile: 'default-profile',
  fontFamily: 'font-family',
  fontSize: 'font-size',
  lineHeight: 'line-height',
  cursorStyle: 'cursor-style',
  cursorBlink: 'cursor-blink',
  scrollback: 'scrollback',
  copyOnSelect: 'copy-on-select',
  rightClick: 'right-click',
  pasteWarning: 'paste-warning',
  bell: 'bell',
  shellIntegration: 'shell-integration',
  restoreSession: 'restore-session',
  notifyWhenDone: 'notify-when-done',
  confirmClose: 'confirm-close',
  history: 'history',
} as const satisfies Readonly<Record<keyof Settings, string>>;

export const DEFAULT_SETTINGS: Settings = {
  defaultProfile: '',
  fontFamily: '',
  fontSize: 13,
  lineHeight: 1.2,
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 10_000,
  copyOnSelect: false,
  rightClick: 'menu',
  pasteWarning: true,
  bell: 'visual',
  shellIntegration: true,
  restoreSession: true,
  notifyWhenDone: true,
  confirmClose: true,
  history: true,
};

export interface Snippet {
  readonly id: string;
  readonly name: string;
  readonly command: string;
  readonly description: string;
  /** Press Enter after pasting. */
  readonly run: boolean;
}

/** A snippet as the editor saves it (`id: null` adds a new one). */
export interface SnippetDraft {
  readonly id: string | null;
  readonly name: string;
  readonly command: string;
  readonly description: string;
  readonly run: boolean;
}

/** Everything the UI needs at start. */
export interface TerminalContext {
  readonly platform: HostPlatform;
  readonly home: string | null;
  readonly profiles: readonly Profile[];
  readonly defaultProfileId: string;
  readonly settings: Settings;
  readonly snippets: readonly Snippet[];
  /** `--cwd <path>` from the command line. */
  readonly startCwd: string | null;
  readonly historyEnabled: boolean;
}

export interface SpawnInfo {
  readonly id: string;
  readonly pid: number | null;
  readonly profileId: string;
  readonly shellName: string;
  readonly cwd: string;
}

/** The program running in a pane right now. */
export interface RunningProcess {
  readonly name: string;
  readonly pid: number;
  /** Percent of one core. */
  readonly cpu: number;
  readonly memoryBytes: number;
}

export interface SessionInfo {
  readonly id: string;
  readonly pid: number | null;
  readonly alive: boolean;
  readonly cwd: string | null;
  readonly lastCommand: string | null;
  readonly running: RunningProcess | null;
}

export interface HistoryEntry {
  readonly id: number;
  readonly command: string;
  readonly cwd: string | null;
  readonly shell: string;
  readonly exitCode: number | null;
  /** Milliseconds since the epoch. */
  readonly startedAt: number;
  readonly durationMs: number | null;
}

export interface HistoryQuery {
  readonly query: string;
  readonly cwd: string | null;
  readonly failedOnly: boolean;
  readonly limit: number;
}

export type GitStatus = 'modified' | 'added' | 'untracked' | 'deleted' | 'renamed' | 'conflicted';

export interface FileNode {
  readonly name: string;
  readonly path: string;
  readonly isDir: boolean;
  readonly isSymlink: boolean;
  readonly size: number | null;
  readonly git: GitStatus | null;
}

export interface DirListing {
  readonly path: string;
  readonly entries: readonly FileNode[];
}

export interface GitInfo {
  readonly root: string;
  /** `null` when HEAD is detached. */
  readonly branch: string | null;
  readonly head: string;
  readonly changes: number;
}

/** Events the shell sends. */
export interface TerminalEvents {
  exit(id: string, code: number | null): void;
  command(id: string, entry: HistoryEntry): void;
  filesChanged(folders: readonly string[]): void;
  open(request: { readonly cwd: string | null; readonly profileId: string | null }): void;
}
