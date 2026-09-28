/**
 * Tabs and their navigation: each tab has its own folder, history, view, sort, selection,
 * filter and search. A pure reducer, so every transition is unit-tested.
 */
import type { Entry, SearchSummary, SortKey, ViewMode } from '../ipc/explorer.types';
import { parentOf } from './path.util';
import { EMPTY_SELECTION, type Selection } from './selection.util';

/** A recursive search running (or finished) in a tab. */
export interface SearchState {
  readonly id: string;
  readonly text: string;
  readonly contents: boolean;
  readonly results: readonly Entry[];
  readonly status: 'running' | 'done' | 'failed';
  readonly summary: SearchSummary | null;
  readonly error: string | null;
}

export interface Tab {
  readonly id: string;
  readonly path: string;
  readonly back: readonly string[];
  readonly forward: readonly string[];
  readonly view: ViewMode;
  readonly sortBy: SortKey;
  readonly sortDescending: boolean;
  readonly selection: Selection;
  /** Instant filter of the current folder. */
  readonly filter: string;
  readonly search: SearchState | null;
}

export interface TabsState {
  readonly tabs: readonly Tab[];
  readonly activeId: string;
}

export interface TabDefaults {
  readonly view: ViewMode;
  readonly sortBy: SortKey;
  readonly sortDescending: boolean;
}

export type TabsAction =
  | { type: 'open'; path: string; select?: readonly string[] | undefined }
  | { type: 'back' }
  | { type: 'forward' }
  | { type: 'up' }
  | { type: 'new-tab'; path: string; defaults: TabDefaults; activate?: boolean | undefined }
  | { type: 'close-tab'; id: string }
  | { type: 'close-other-tabs'; id: string }
  | { type: 'activate'; id: string }
  | { type: 'cycle'; delta: number }
  | { type: 'select'; selection: Selection }
  | { type: 'filter'; filter: string }
  | { type: 'view'; view: ViewMode }
  | { type: 'sort'; sortBy: SortKey; sortDescending: boolean }
  | { type: 'search-start'; id: string; text: string; contents: boolean }
  | { type: 'search-results'; id: string; entries: readonly Entry[] }
  | { type: 'search-done'; id: string; summary: SearchSummary | null; error: string | null }
  | { type: 'search-clear' }
  /** A folder was renamed or moved: tabs inside it follow. */
  | { type: 'relocate'; from: string; to: string };

let nextId = 0;
/** A fresh tab id. */
export function newTabId(): string {
  nextId += 1;
  return `tab-${Date.now().toString(36)}-${nextId}`;
}

export function createTab(path: string, defaults: TabDefaults, id = newTabId()): Tab {
  return {
    id,
    path,
    back: [],
    forward: [],
    ...defaults,
    selection: EMPTY_SELECTION,
    filter: '',
    search: null,
  };
}

/** The active tab (there is always one). */
export function activeTab(state: TabsState): Tab {
  const tab = state.tabs.find((candidate) => candidate.id === state.activeId) ?? state.tabs[0];
  if (tab === undefined) throw new Error('the explorer has no tabs');
  return tab;
}

const HISTORY_LIMIT = 100;

function go(tab: Tab, path: string, select: readonly string[] = []): Tab {
  if (path === tab.path) return { ...tab, search: null };
  return {
    ...tab,
    path,
    back: [...tab.back, tab.path].slice(-HISTORY_LIMIT),
    forward: [],
    selection:
      select.length > 0
        ? { selected: select, anchor: select[0] ?? null, focus: select[0] ?? null }
        : EMPTY_SELECTION,
    filter: '',
    search: null,
  };
}

function updateActive(state: TabsState, update: (tab: Tab) => Tab): TabsState {
  return {
    ...state,
    tabs: state.tabs.map((tab) => (tab.id === state.activeId ? update(tab) : tab)),
  };
}

function updateSearch(
  state: TabsState,
  id: string,
  update: (search: SearchState) => SearchState,
): TabsState {
  return {
    ...state,
    tabs: state.tabs.map((tab) =>
      tab.search?.id === id ? { ...tab, search: update(tab.search) } : tab,
    ),
  };
}

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case 'open':
      return updateActive(state, (tab) => go(tab, action.path, action.select));
    case 'back':
      return updateActive(state, (tab) => {
        const previous = tab.back.at(-1);
        if (previous === undefined) return tab;
        return {
          ...go(tab, previous, [tab.path]),
          back: tab.back.slice(0, -1),
          forward: [tab.path, ...tab.forward],
        };
      });
    case 'forward':
      return updateActive(state, (tab) => {
        const [next, ...rest] = tab.forward;
        if (next === undefined) return tab;
        return { ...go(tab, next), forward: rest };
      });
    case 'up':
      return updateActive(state, (tab) => {
        const parent = parentOf(tab.path);
        return parent === null ? tab : go(tab, parent, [tab.path]);
      });
    case 'new-tab': {
      const tab = createTab(action.path, action.defaults);
      const index = state.tabs.findIndex((candidate) => candidate.id === state.activeId);
      const tabs = [...state.tabs];
      tabs.splice(index + 1, 0, tab);
      return { tabs, activeId: action.activate === false ? state.activeId : tab.id };
    }
    case 'close-tab': {
      if (state.tabs.length <= 1) return state;
      const index = state.tabs.findIndex((tab) => tab.id === action.id);
      if (index === -1) return state;
      const tabs = state.tabs.filter((tab) => tab.id !== action.id);
      const activeId =
        state.activeId === action.id
          ? (tabs[Math.min(index, tabs.length - 1)]?.id ?? state.activeId)
          : state.activeId;
      return { tabs, activeId };
    }
    case 'close-other-tabs':
      return { tabs: state.tabs.filter((tab) => tab.id === action.id), activeId: action.id };
    case 'activate':
      return state.tabs.some((tab) => tab.id === action.id)
        ? { ...state, activeId: action.id }
        : state;
    case 'cycle': {
      const index = state.tabs.findIndex((tab) => tab.id === state.activeId);
      const count = state.tabs.length;
      const next = state.tabs[(index + action.delta + count) % count];
      return next === undefined ? state : { ...state, activeId: next.id };
    }
    case 'select':
      return updateActive(state, (tab) => ({ ...tab, selection: action.selection }));
    case 'filter':
      return updateActive(state, (tab) => ({ ...tab, filter: action.filter }));
    case 'view':
      return updateActive(state, (tab) => ({ ...tab, view: action.view }));
    case 'sort':
      return updateActive(state, (tab) => ({
        ...tab,
        sortBy: action.sortBy,
        sortDescending: action.sortDescending,
      }));
    case 'search-start':
      return updateActive(state, (tab) => ({
        ...tab,
        selection: EMPTY_SELECTION,
        search: {
          id: action.id,
          text: action.text,
          contents: action.contents,
          results: [],
          status: 'running',
          summary: null,
          error: null,
        },
      }));
    case 'search-results':
      return updateSearch(state, action.id, (search) => ({
        ...search,
        results: [...search.results, ...action.entries],
      }));
    case 'search-done':
      return updateSearch(state, action.id, (search) => ({
        ...search,
        status: action.error === null ? 'done' : 'failed',
        summary: action.summary,
        error: action.error,
      }));
    case 'search-clear':
      return updateActive(state, (tab) => ({ ...tab, search: null, selection: EMPTY_SELECTION }));
    case 'relocate':
      return {
        ...state,
        tabs: state.tabs.map((tab) => {
          const moved = relocatePath(tab.path, action.from, action.to);
          return moved === tab.path ? tab : { ...tab, path: moved };
        }),
      };
  }
}

/** `path` rewritten when it is `from` or inside it. */
export function relocatePath(path: string, from: string, to: string): string {
  if (path === from) return to;
  for (const sep of ['/', '\\']) {
    const prefix = from.endsWith(sep) ? from : `${from}${sep}`;
    if (path.startsWith(prefix))
      return `${to}${to.endsWith(sep) ? '' : sep}${path.slice(prefix.length)}`;
  }
  return path;
}
