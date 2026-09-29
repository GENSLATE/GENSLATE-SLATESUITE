/**
 * The backend in a plain browser: simulated shells (`MockShell`), an in-memory history and
 * snippets, and the sample machine from `terminal.mock-data.ts`. Same interface and the same
 * events as the desktop app, so the whole UI can be designed and tested without Tauri.
 */
import { MockShell } from './mock-shell';
import type { SpawnRequest, TerminalBackend } from './terminal.client';
import {
  MOCK_HOME,
  MOCK_PROFILES,
  MOCK_PROJECT,
  MOCK_SNIPPETS,
  mockCanonical,
  mockChildren,
  mockHistory,
  mockLookup,
} from './terminal.mock-data';
import {
  DEFAULT_SETTINGS,
  type HistoryEntry,
  type SessionInfo,
  type Settings,
  type Snippet,
  type TerminalEvents,
} from './terminal.types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function slug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base === '' ? 'snippet' : base;
}

export function createMockBackend(): TerminalBackend {
  const shells = new Map<string, MockShell>();
  const listeners = new Set<TerminalEvents>();
  const history: HistoryEntry[] = mockHistory(Date.now());
  let snippets: readonly Snippet[] = MOCK_SNIPPETS;
  let settings: Settings = DEFAULT_SETTINGS;
  let nextHistoryId = history.length + 1;
  let pid = 18_400;

  const emit = <K extends keyof TerminalEvents>(
    event: K,
    ...args: Parameters<TerminalEvents[K]>
  ) => {
    for (const listener of listeners) {
      (listener[event] as (...values: Parameters<TerminalEvents[K]>) => void)(...args);
    }
  };

  const spawn = (request: SpawnRequest, onData: (bytes: Uint8Array) => void) => {
    const profile = MOCK_PROFILES.find((candidate) => candidate.id === request.profileId);
    if (profile === undefined)
      return Promise.reject(new Error(`No profile “${request.profileId}”`));
    const cwd =
      mockCanonical(request.cwd ?? profile.cwd ?? MOCK_PROJECT) ??
      mockCanonical(MOCK_PROJECT) ??
      MOCK_HOME;
    const nonce = crypto.randomUUID();
    const shell = new MockShell({
      profile,
      cwd,
      nonce,
      cols: request.cols,
      emit: (text) => onData(encoder.encode(text)),
      onCommand: (result) => {
        const entry: HistoryEntry = {
          id: nextHistoryId,
          command: result.command,
          cwd: result.cwd,
          shell: profile.name,
          exitCode: result.exitCode,
          startedAt: result.startedAt,
          durationMs: result.durationMs,
        };
        nextHistoryId += 1;
        if (settings.history) {
          history.unshift(entry);
          emit('command', request.id, entry);
        }
      },
      onExit: (code) => {
        shells.delete(request.id);
        emit('exit', request.id, code);
      },
    });
    shells.set(request.id, shell);
    pid += 12;
    // Let the pane settle before the greeting, as a real shell would take a moment.
    setTimeout(() => shell.start(), 60);
    return Promise.resolve({
      id: request.id,
      pid,
      profileId: profile.id,
      shellName: profile.name,
      cwd,
      nonce,
    });
  };

  return {
    context: () =>
      Promise.resolve({
        platform: 'windows',
        home: MOCK_HOME,
        profiles: MOCK_PROFILES,
        defaultProfileId: settings.defaultProfile === '' ? 'pwsh' : settings.defaultProfile,
        settings,
        snippets,
        startCwd: null,
        historyEnabled: true,
      }),
    spawn,
    write: (id, bytes) => {
      shells.get(id)?.write(decoder.decode(bytes));
      return Promise.resolve();
    },
    resize: (id, cols) => {
      const shell = shells.get(id);
      if (shell !== undefined) shell.cols = cols;
      return Promise.resolve();
    },
    kill: (id) => {
      shells.get(id)?.close();
      shells.delete(id);
      return Promise.resolve();
    },
    sessions: (ids) =>
      Promise.resolve(
        ids.flatMap((id): SessionInfo[] => {
          const shell = shells.get(id);
          if (shell === undefined) return [];
          return [
            {
              id,
              pid: 18_400,
              alive: true,
              cwd: shell.cwd,
              lastCommand: shell.lastCommand,
              running: shell.busy
                ? { name: 'bun.exe', pid: 18_512, cpu: 42.5, memoryBytes: 184_000_000 }
                : null,
            },
          ];
        }),
      ),
    searchHistory: (query) => {
      const needle = query.query.trim().toLowerCase();
      const seen = new Set<string>();
      const rows = history.filter((entry) => {
        if (query.failedOnly && (entry.exitCode === 0 || entry.exitCode === null)) return false;
        if (query.cwd !== null && entry.cwd !== query.cwd) return false;
        if (needle !== '' && !fuzzy(entry.command.toLowerCase(), needle)) return false;
        if (seen.has(entry.command)) return false;
        seen.add(entry.command);
        return true;
      });
      return Promise.resolve(rows.slice(0, query.limit));
    },
    deleteHistory: (id) => {
      const index = history.findIndex((entry) => entry.id === id);
      if (index !== -1) history.splice(index, 1);
      return Promise.resolve();
    },
    clearHistory: () => {
      history.splice(0);
      return Promise.resolve();
    },
    saveSnippet: (draft) => {
      const name = draft.name.trim();
      if (name === '' || draft.command.trim() === '') {
        return Promise.reject(new Error('A snippet needs a name and a command.'));
      }
      if (draft.id === null) {
        let id = slug(name);
        for (let n = 2; snippets.some((snippet) => snippet.id === id); n += 1)
          id = `${slug(name)}-${n}`;
        snippets = [...snippets, { ...draft, id, name }];
      } else {
        snippets = snippets.map((snippet) =>
          snippet.id === draft.id ? { ...draft, id: snippet.id, name } : snippet,
        );
      }
      return Promise.resolve(snippets);
    },
    deleteSnippet: (id) => {
      snippets = snippets.filter((snippet) => snippet.id !== id);
      return Promise.resolve(snippets);
    },
    listDir: (path, showHidden) => {
      if (mockLookup(path)?.dir === undefined) {
        return Promise.reject(new Error(`${path} is not a folder`));
      }
      return Promise.resolve({ path, entries: mockChildren(path, showHidden) });
    },
    gitInfo: (path) =>
      Promise.resolve(
        path.toLowerCase().startsWith(MOCK_PROJECT.toLowerCase())
          ? { root: MOCK_PROJECT, branch: 'main', head: '300d61f', changes: 5 }
          : null,
      ),
    watchDirs: () => Promise.resolve(),
    openPath: () => Promise.resolve(),
    revealPath: () => Promise.resolve(),
    saveOutput: (fileName) => Promise.resolve(`${MOCK_HOME}\\Downloads\\${fileName}`),
    setSetting: (key, value) => {
      settings = { ...settings, [key]: value };
      return Promise.resolve(settings);
    },
    subscribe: (events) => {
      listeners.add(events);
      return Promise.resolve(() => {
        listeners.delete(events);
      });
    },
  };
}

/** Every character of `needle` appears in `haystack` in order. */
function fuzzy(haystack: string, needle: string): boolean {
  let at = 0;
  for (const char of needle) {
    at = haystack.indexOf(char, at);
    if (at === -1) return false;
    at += 1;
  }
  return true;
}
