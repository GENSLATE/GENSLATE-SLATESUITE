/**
 * The terminal backend: typed calls into `src-tauri/src/commands` through
 * `@genslate/tauri-bridge`, or a simulated shell when the UI runs in a plain browser
 * (`bun x moon run terminal:web-dev`) so it can be designed and screenshot anywhere.
 */
import {
  channelBytes,
  createChannel,
  invokeBytes,
  invokeCommand,
  isTauri,
  listenEvent,
} from '@genslate/tauri-bridge';

import { createMockBackend } from './terminal.mock';
import {
  parseCommandEvent,
  parseContext,
  parseDirListing,
  parseExitEvent,
  parseGitInfo,
  parseHistory,
  parseOpenRequest,
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

/** Names the session of a `pty_write`, whose body is the raw input bytes. */
const SESSION_HEADER = 'x-session-id';

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
  /** Sends input bytes to a session, exactly as given. */
  write(id: string, bytes: Uint8Array): Promise<void>;
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
    write: (id, bytes) => invokeBytes('pty_write', bytes, { [SESSION_HEADER]: id }),
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
      const results = await Promise.allSettled([
        listenEvent<unknown>('terminal://exit', (payload) =>
          guarded('exit', () => {
            const { id, code } = parseExitEvent(payload);
            events.exit(id, code);
          }),
        ),
        listenEvent<unknown>('terminal://command', (payload) =>
          guarded('command', () => {
            const { id, entry } = parseCommandEvent(payload);
            events.command(id, entry);
          }),
        ),
        listenEvent<unknown>('terminal://files-changed', (payload) =>
          guarded('files-changed', () =>
            events.filesChanged(parseStrings(payload, 'changed folders')),
          ),
        ),
        listenEvent<unknown>('terminal://open', (payload) =>
          guarded('open', () => events.open(parseOpenRequest(payload))),
        ),
      ]);
      const unsubscribers = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      const failed = results.find((result) => result.status === 'rejected');
      if (failed !== undefined) {
        // One listener failed: drop the ones that worked, or they'd leak.
        for (const unsubscribe of unsubscribers) unsubscribe();
        throw failed.reason;
      }
      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    },
  };
}

/** Runs an event handler, logging (not throwing) a payload that doesn't parse. */
function guarded(event: string, handle: () => void): void {
  try {
    handle();
  } catch (error) {
    console.warn(`terminal: ignored a malformed ${event} event`, error);
  }
}

/** The real shell in the desktop app; the simulated one in a browser. */
export function createBackend(): TerminalBackend {
  return isTauri() ? createTauriBackend() : createMockBackend();
}
