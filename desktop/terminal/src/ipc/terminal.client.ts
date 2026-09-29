/**
 * The terminal backend: typed calls into `src-tauri/src/commands` through
 * `@genslate/tauri-bridge`, or a simulated shell when the UI runs in a plain browser
 * (`bun x moon run terminal:web-dev`) so it can be designed and screenshot anywhere.
 */
import {
  channelBytes,
  createChannel,
  invokeCommand,
  isTauri,
  listenEvent,
} from '@genslate/tauri-bridge';

import { createMockBackend } from './terminal.mock';
import {
  parseContext,
  parseDirListing,
  parseGitInfo,
  parseHistory,
  parseHistoryEntry,
  parseSessionInfos,
  parseSettings,
  parseSnippets,
  parseSpawnInfo,
  parseStrings,
} from './terminal.parse';
import type {
  DirListing,
  GitInfo,
  HistoryEntry,
  HistoryQuery,
  SessionInfo,
  Settings,
  Snippet,
  SnippetDraft,
  SpawnInfo,
  TerminalContext,
  TerminalEvents,
} from './terminal.types';
import { SETTING_KEYS } from './terminal.types';

export interface SpawnRequest {
  /** The pane's id; every later call names the session by it. */
  readonly id: string;
  readonly profileId: string;
  readonly cwd: string | null;
  readonly cols: number;
  readonly rows: number;
}

/** Everything the UI can ask of the shell. */
export interface TerminalBackend {
  context(): Promise<TerminalContext>;
  /** Starts a shell in a pseudo-terminal; its output streams to `onData` as raw bytes. */
  spawn(request: SpawnRequest, onData: (bytes: Uint8Array) => void): Promise<SpawnInfo>;
  write(id: string, data: string): Promise<void>;
  resize(id: string, cols: number, rows: number): Promise<void>;
  kill(id: string): Promise<void>;
  sessions(ids: readonly string[]): Promise<readonly SessionInfo[]>;
  searchHistory(query: HistoryQuery): Promise<readonly HistoryEntry[]>;
  deleteHistory(id: number): Promise<void>;
  clearHistory(): Promise<void>;
  saveSnippet(snippet: SnippetDraft): Promise<readonly Snippet[]>;
  deleteSnippet(id: string): Promise<readonly Snippet[]>;
  listDir(path: string, showHidden: boolean): Promise<DirListing>;
  gitInfo(path: string): Promise<GitInfo | null>;
  watchDirs(paths: readonly string[]): Promise<void>;
  openPath(path: string): Promise<void>;
  revealPath(path: string): Promise<void>;
  /** Writes text to a new file in Downloads; resolves to its path. */
  saveOutput(fileName: string, text: string): Promise<string>;
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<Settings>;
  /** Subscribes to every event; resolves to an unsubscribe function. */
  subscribe(events: TerminalEvents): Promise<() => void>;
}

function createTauriBackend(): TerminalBackend {
  return {
    context: async () => parseContext(await invokeCommand('get_context')),
    spawn: async (request, onData) => {
      const output = createChannel((message) => {
        const bytes = channelBytes(message);
        if (bytes !== null) onData(bytes);
      });
      return parseSpawnInfo(await invokeCommand('pty_spawn', { ...request, output }));
    },
    write: (id, data) => invokeCommand('pty_write', { id, data }),
    resize: (id, cols, rows) => invokeCommand('pty_resize', { id, cols, rows }),
    kill: (id) => invokeCommand('pty_kill', { id }),
    sessions: async (ids) => parseSessionInfos(await invokeCommand('sessions_info', { ids })),
    searchHistory: async (query) =>
      parseHistory(await invokeCommand('history_search', { ...query })),
    deleteHistory: (id) => invokeCommand('history_delete', { id }),
    clearHistory: () => invokeCommand('history_clear'),
    saveSnippet: async (snippet) => parseSnippets(await invokeCommand('save_snippet', { snippet })),
    deleteSnippet: async (id) => parseSnippets(await invokeCommand('delete_snippet', { id })),
    listDir: async (path, showHidden) =>
      parseDirListing(await invokeCommand('list_dir', { path, showHidden })),
    gitInfo: async (path) => parseGitInfo(await invokeCommand('git_info', { path })),
    watchDirs: (paths) => invokeCommand('watch_dirs', { paths }),
    openPath: (path) => invokeCommand('open_path', { path }),
    revealPath: (path) => invokeCommand('reveal_path', { path }),
    saveOutput: async (fileName, text) => {
      const path = await invokeCommand<unknown>('save_output', { fileName, text });
      if (typeof path !== 'string') throw new TypeError('save_output returned no path');
      return path;
    },
    setSetting: async (key, value) =>
      parseSettings(await invokeCommand('set_setting', { key: SETTING_KEYS[key], value })),
    subscribe: async (events) => {
      const unsubscribers = await Promise.all([
        listenEvent<{ id: string; code: number | null }>('terminal://exit', (payload) =>
          events.exit(payload.id, payload.code),
        ),
        listenEvent<{ id: string; entry: unknown }>('terminal://command', (payload) =>
          events.command(payload.id, parseHistoryEntry(payload.entry)),
        ),
        listenEvent<unknown>('terminal://files-changed', (payload) =>
          events.filesChanged(parseStrings(payload, 'changed folders')),
        ),
        listenEvent<{ cwd: string | null; profileId: string | null }>(
          'terminal://open',
          (payload) =>
            events.open({ cwd: payload.cwd ?? null, profileId: payload.profileId ?? null }),
        ),
      ]);
      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    },
  };
}

/** The real shell in the desktop app; the simulated one in a browser. */
export function createBackend(): TerminalBackend {
  return isTauri() ? createTauriBackend() : createMockBackend();
}
