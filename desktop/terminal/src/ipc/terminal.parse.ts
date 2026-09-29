/**
 * Boundary checks for IPC payloads: cheap structural validation so a mismatched Rust/TS pair
 * fails loudly at the edge instead of deep inside a component.
 */
import {
  type CursorStyle,
  DEFAULT_SETTINGS,
  type DirListing,
  type FileNode,
  type GitInfo,
  type GitStatus,
  type HistoryEntry,
  type HostPlatform,
  type Profile,
  type ProfileColor,
  type ProfileIcon,
  type SessionInfo,
  type Settings,
  type ShellKind,
  type Snippet,
  type SpawnInfo,
  type TerminalContext,
} from './terminal.types';

/** Thrown when a payload doesn't have the expected shape. */
export class PayloadError extends Error {
  constructor(what: string) {
    super(`Unexpected ${what} from the terminal backend`);
    this.name = 'PayloadError';
  }
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function object(value: unknown, what: string): Json {
  if (!isObject(value)) throw new PayloadError(what);
  return value;
}

function array(value: unknown, what: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new PayloadError(what);
  return value;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new PayloadError(what);
  return value;
}

function nullableText(value: unknown, what: string): string | null {
  if (value === null || value === undefined) return null;
  return text(value, what);
}

function num(value: unknown, what: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) throw new PayloadError(what);
  return value;
}

function nullableNum(value: unknown, what: string): number | null {
  if (value === null || value === undefined) return null;
  return num(value, what);
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const PLATFORMS: readonly HostPlatform[] = ['windows', 'macos', 'linux'];
const ICONS: readonly ProfileIcon[] = [
  'powershell',
  'cmd',
  'linux',
  'ubuntu',
  'debian',
  'bash',
  'zsh',
  'fish',
  'nu',
  'git',
  'vs',
  'terminal',
];
const KINDS: readonly ShellKind[] = [
  'pwsh',
  'powershell',
  'cmd',
  'bash',
  'zsh',
  'fish',
  'nu',
  'sh',
  'wsl',
  'other',
];
const COLORS: readonly ProfileColor[] = [
  'frost',
  'aurora-red',
  'aurora-orange',
  'aurora-yellow',
  'aurora-green',
  'aurora-purple',
];
const CURSORS: readonly CursorStyle[] = ['block', 'bar', 'underline'];
const GIT: readonly GitStatus[] = [
  'modified',
  'added',
  'untracked',
  'deleted',
  'renamed',
  'conflicted',
];

export function parseProfile(value: unknown): Profile {
  const raw = object(value, 'profile');
  return {
    id: text(raw['id'], 'profile id'),
    name: text(raw['name'], 'profile name'),
    command: text(raw['command'], 'profile command'),
    args: array(raw['args'] ?? [], 'profile args').map((arg) => text(arg, 'profile arg')),
    cwd: nullableText(raw['cwd'], 'profile cwd'),
    icon: oneOf(raw['icon'], ICONS, 'terminal'),
    color: raw['color'] === null ? null : oneOf(raw['color'], COLORS, 'frost'),
    kind: oneOf(raw['kind'], KINDS, 'other'),
    source: raw['source'] === 'config' ? 'config' : 'detected',
  };
}

function bool(raw: Json, key: string, fallback: boolean): boolean {
  const value = raw[key];
  return typeof value === 'boolean' ? value : fallback;
}

function numberOr(raw: Json, key: string, fallback: number): number {
  const value = raw[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function textOr(raw: Json, key: string, fallback: string): string {
  const value = raw[key];
  return typeof value === 'string' ? value : fallback;
}

/** Settings use their config.toml keys; unknown or missing values fall back to defaults. */
export function parseSettings(value: unknown): Settings {
  const raw = object(value, 'settings');
  const d = DEFAULT_SETTINGS;
  return {
    defaultProfile: textOr(raw, 'default-profile', d.defaultProfile),
    fontFamily: textOr(raw, 'font-family', d.fontFamily),
    fontSize: numberOr(raw, 'font-size', d.fontSize),
    lineHeight: numberOr(raw, 'line-height', d.lineHeight),
    cursorStyle: oneOf(raw['cursor-style'], CURSORS, d.cursorStyle),
    cursorBlink: bool(raw, 'cursor-blink', d.cursorBlink),
    scrollback: numberOr(raw, 'scrollback', d.scrollback),
    copyOnSelect: bool(raw, 'copy-on-select', d.copyOnSelect),
    rightClick: raw['right-click'] === 'paste' ? 'paste' : 'menu',
    pasteWarning: bool(raw, 'paste-warning', d.pasteWarning),
    bell: raw['bell'] === 'none' ? 'none' : 'visual',
    shellIntegration: bool(raw, 'shell-integration', d.shellIntegration),
    restoreSession: bool(raw, 'restore-session', d.restoreSession),
    notifyWhenDone: bool(raw, 'notify-when-done', d.notifyWhenDone),
    confirmClose: bool(raw, 'confirm-close', d.confirmClose),
    history: bool(raw, 'history', d.history),
  };
}

export function parseSnippet(value: unknown): Snippet {
  const raw = object(value, 'snippet');
  return {
    id: text(raw['id'], 'snippet id'),
    name: text(raw['name'], 'snippet name'),
    command: text(raw['command'], 'snippet command'),
    description: textOr(raw, 'description', ''),
    run: bool(raw, 'run', false),
  };
}

export function parseSnippets(value: unknown): readonly Snippet[] {
  return array(value, 'snippets').map(parseSnippet);
}

export function parseContext(value: unknown): TerminalContext {
  const raw = object(value, 'context');
  const profiles = array(raw['profiles'], 'profiles').map(parseProfile);
  return {
    platform: oneOf(raw['platform'], PLATFORMS, 'linux'),
    home: nullableText(raw['home'], 'home'),
    profiles,
    defaultProfileId: text(raw['defaultProfileId'], 'default profile'),
    settings: parseSettings(raw['settings']),
    snippets: parseSnippets(raw['snippets'] ?? []),
    startCwd: nullableText(raw['startCwd'], 'start folder'),
    historyEnabled: raw['historyEnabled'] === true,
  };
}

export function parseSpawnInfo(value: unknown): SpawnInfo {
  const raw = object(value, 'spawn result');
  return {
    id: text(raw['id'], 'session id'),
    pid: nullableNum(raw['pid'], 'pid'),
    profileId: text(raw['profileId'], 'profile id'),
    shellName: text(raw['shellName'], 'shell name'),
    cwd: text(raw['cwd'], 'cwd'),
    nonce: nullableText(raw['nonce'], 'nonce'),
  };
}

export function parseSessionInfos(value: unknown): readonly SessionInfo[] {
  return array(value, 'sessions').map((item) => {
    const raw = object(item, 'session');
    const running = raw['running'];
    return {
      id: text(raw['id'], 'session id'),
      pid: nullableNum(raw['pid'], 'pid'),
      alive: raw['alive'] === true,
      cwd: nullableText(raw['cwd'], 'cwd'),
      lastCommand: nullableText(raw['lastCommand'], 'last command'),
      running:
        running === null || running === undefined
          ? null
          : (() => {
              const process = object(running, 'process');
              return {
                name: text(process['name'], 'process name'),
                pid: num(process['pid'], 'process pid'),
                cpu: numberOr(process, 'cpu', 0),
                memoryBytes: numberOr(process, 'memoryBytes', 0),
              };
            })(),
    };
  });
}

export function parseHistoryEntry(value: unknown): HistoryEntry {
  const raw = object(value, 'history entry');
  return {
    id: num(raw['id'], 'history id'),
    command: text(raw['command'], 'command'),
    cwd: nullableText(raw['cwd'], 'cwd'),
    shell: textOr(raw, 'shell', ''),
    exitCode: nullableNum(raw['exitCode'], 'exit code'),
    startedAt: num(raw['startedAt'], 'start time'),
    durationMs: nullableNum(raw['durationMs'], 'duration'),
  };
}

export function parseHistory(value: unknown): readonly HistoryEntry[] {
  return array(value, 'history').map(parseHistoryEntry);
}

function parseFileNode(value: unknown): FileNode {
  const raw = object(value, 'file');
  return {
    name: text(raw['name'], 'file name'),
    path: text(raw['path'], 'file path'),
    isDir: raw['isDir'] === true,
    isSymlink: raw['isSymlink'] === true,
    size: nullableNum(raw['size'], 'file size'),
    git:
      raw['git'] === null || raw['git'] === undefined ? null : oneOf(raw['git'], GIT, 'modified'),
  };
}

export function parseDirListing(value: unknown): DirListing {
  const raw = object(value, 'listing');
  return {
    path: text(raw['path'], 'listing path'),
    entries: array(raw['entries'], 'entries').map(parseFileNode),
  };
}

export function parseGitInfo(value: unknown): GitInfo | null {
  if (value === null || value === undefined) return null;
  const raw = object(value, 'git info');
  return {
    root: text(raw['root'], 'repository root'),
    branch: nullableText(raw['branch'], 'branch'),
    head: textOr(raw, 'head', ''),
    changes: numberOr(raw, 'changes', 0),
  };
}

export function parseStrings(value: unknown, what: string): readonly string[] {
  return array(value, what).map((item) => text(item, what));
}

/** `terminal://exit`: a session's shell ended. */
export function parseExitEvent(value: unknown): {
  readonly id: string;
  readonly code: number | null;
} {
  const raw = object(value, 'exit event');
  return { id: text(raw['id'], 'session id'), code: nullableNum(raw['code'], 'exit code') };
}

/** `terminal://command`: a session finished a command. */
export function parseCommandEvent(value: unknown): {
  readonly id: string;
  readonly entry: HistoryEntry;
} {
  const raw = object(value, 'command event');
  return { id: text(raw['id'], 'session id'), entry: parseHistoryEntry(raw['entry']) };
}

/** `terminal://open`: a second launch asked for a tab. */
export function parseOpenRequest(value: unknown): {
  readonly cwd: string | null;
  readonly profileId: string | null;
} {
  const raw = object(value, 'open request');
  return {
    cwd: nullableText(raw['cwd'], 'cwd'),
    profileId: nullableText(raw['profileId'], 'profile id'),
  };
}
