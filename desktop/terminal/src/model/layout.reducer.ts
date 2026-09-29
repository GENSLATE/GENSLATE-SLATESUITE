/**
 * The window's tabs and each tab's split panes. Pure: ids for new tabs and panes come in with
 * the action, so the reducer stays deterministic and testable.
 */
import type { ProfileColor } from '../ipc/terminal.types';
import {
  equalize,
  type FocusDirection,
  findLeaf,
  leaves,
  neighbor,
  type PaneLeaf,
  type PaneNode,
  removeLeaf,
  type SplitDirection,
  setRatio,
  splitLeaf,
} from './pane-tree.util';

export interface TabState {
  readonly id: string;
  readonly root: PaneNode;
  readonly activePaneId: string;
  /** A pane shown alone, full size. */
  readonly zoomedPaneId: string | null;
  /** A name the user gave the tab (`null`: follow the shell's title). */
  readonly title: string | null;
  readonly color: ProfileColor | null;
  /** Typing goes to every pane in the tab. */
  readonly broadcast: boolean;
}

export interface LayoutState {
  readonly tabs: readonly TabState[];
  /** `null` only when every tab is closed. */
  readonly activeTabId: string | null;
}

export type LayoutAction =
  | {
      readonly type: 'new-tab';
      readonly id: string;
      readonly pane: PaneLeaf;
      readonly after?: string;
    }
  | { readonly type: 'close-tab'; readonly id: string }
  | { readonly type: 'close-other-tabs'; readonly id: string }
  | { readonly type: 'activate-tab'; readonly id: string }
  | { readonly type: 'cycle-tab'; readonly delta: number }
  | { readonly type: 'move-tab'; readonly id: string; readonly to: number }
  | { readonly type: 'rename-tab'; readonly id: string; readonly title: string | null }
  | { readonly type: 'color-tab'; readonly id: string; readonly color: ProfileColor | null }
  | {
      readonly type: 'split';
      readonly paneId: string;
      readonly direction: SplitDirection;
      readonly pane: PaneLeaf;
      readonly splitId: string;
    }
  | { readonly type: 'close-pane'; readonly paneId: string }
  | { readonly type: 'focus-pane'; readonly paneId: string }
  | { readonly type: 'focus-direction'; readonly direction: FocusDirection }
  | {
      readonly type: 'resize-split';
      readonly tabId: string;
      readonly splitId: string;
      readonly ratio: number;
    }
  | { readonly type: 'equalize'; readonly tabId: string }
  | { readonly type: 'toggle-zoom' }
  | { readonly type: 'toggle-broadcast'; readonly tabId: string }
  | { readonly type: 'restore'; readonly state: LayoutState };

export const EMPTY_LAYOUT: LayoutState = { tabs: [], activeTabId: null };

export function activeTab(state: LayoutState): TabState | null {
  return state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;
}

/** The tab holding pane `paneId`. */
export function tabOfPane(state: LayoutState, paneId: string): TabState | null {
  return state.tabs.find((tab) => findLeaf(tab.root, paneId) !== null) ?? null;
}

/** Every pane in every tab. */
export function allPanes(state: LayoutState): readonly PaneLeaf[] {
  return state.tabs.flatMap((tab) => leaves(tab.root));
}

function updateTab(
  state: LayoutState,
  id: string,
  update: (tab: TabState) => TabState,
): LayoutState {
  let changed = false;
  const tabs = state.tabs.map((tab) => {
    if (tab.id !== id) return tab;
    const next = update(tab);
    changed ||= next !== tab;
    return next;
  });
  return changed ? { ...state, tabs } : state;
}

function closeTab(state: LayoutState, id: string): LayoutState {
  const index = state.tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return state;
  const tabs = state.tabs.filter((tab) => tab.id !== id);
  if (state.activeTabId !== id) return { ...state, tabs };
  // Like a browser: the tab to the right takes over, else the one to the left.
  const next = tabs[Math.min(index, tabs.length - 1)] ?? null;
  return { tabs, activeTabId: next?.id ?? null };
}

export function layoutReducer(state: LayoutState, action: LayoutAction): LayoutState {
  switch (action.type) {
    case 'new-tab': {
      const tab: TabState = {
        id: action.id,
        root: action.pane,
        activePaneId: action.pane.id,
        zoomedPaneId: null,
        title: null,
        color: null,
        broadcast: false,
      };
      const after =
        action.after === undefined ? -1 : state.tabs.findIndex((t) => t.id === action.after);
      const tabs =
        after === -1
          ? [...state.tabs, tab]
          : [...state.tabs.slice(0, after + 1), tab, ...state.tabs.slice(after + 1)];
      return { tabs, activeTabId: tab.id };
    }
    case 'close-tab':
      return closeTab(state, action.id);
    case 'close-other-tabs': {
      const keep = state.tabs.find((tab) => tab.id === action.id);
      return keep === undefined ? state : { tabs: [keep], activeTabId: keep.id };
    }
    case 'activate-tab':
      return state.tabs.some((tab) => tab.id === action.id) && state.activeTabId !== action.id
        ? { ...state, activeTabId: action.id }
        : state;
    case 'cycle-tab': {
      if (state.tabs.length < 2) return state;
      const index = state.tabs.findIndex((tab) => tab.id === state.activeTabId);
      const next = state.tabs[(index + action.delta + state.tabs.length * 8) % state.tabs.length];
      return next === undefined ? state : { ...state, activeTabId: next.id };
    }
    case 'move-tab': {
      const from = state.tabs.findIndex((tab) => tab.id === action.id);
      const moving = state.tabs[from];
      if (moving === undefined) return state;
      const to = Math.max(0, Math.min(state.tabs.length - 1, action.to));
      if (to === from) return state;
      const rest = state.tabs.filter((tab) => tab.id !== action.id);
      return { ...state, tabs: [...rest.slice(0, to), moving, ...rest.slice(to)] };
    }
    case 'rename-tab': {
      const title = action.title?.trim() ?? '';
      return updateTab(state, action.id, (tab) => ({ ...tab, title: title === '' ? null : title }));
    }
    case 'color-tab':
      return updateTab(state, action.id, (tab) => ({ ...tab, color: action.color }));
    case 'split': {
      const tab = tabOfPane(state, action.paneId);
      if (tab === null) return state;
      return updateTab(state, tab.id, (current) => ({
        ...current,
        root: splitLeaf(current.root, action.paneId, action.direction, action.pane, action.splitId),
        activePaneId: action.pane.id,
        zoomedPaneId: null,
      }));
    }
    case 'close-pane': {
      const tab = tabOfPane(state, action.paneId);
      if (tab === null) return state;
      const root = removeLeaf(tab.root, action.paneId);
      if (root === null) return closeTab(state, tab.id);
      const order = leaves(tab.root).map((leaf) => leaf.id);
      const index = order.indexOf(action.paneId);
      const remaining = leaves(root);
      const nextActive =
        tab.activePaneId === action.paneId
          ? ((remaining[Math.max(0, index - 1)] ?? remaining[0])?.id ?? tab.activePaneId)
          : tab.activePaneId;
      return updateTab(state, tab.id, (current) => ({
        ...current,
        root,
        activePaneId: nextActive,
        zoomedPaneId: current.zoomedPaneId === action.paneId ? null : current.zoomedPaneId,
      }));
    }
    case 'focus-pane': {
      const tab = tabOfPane(state, action.paneId);
      if (tab === null) return state;
      const focused = updateTab(state, tab.id, (current) =>
        current.activePaneId === action.paneId
          ? current
          : { ...current, activePaneId: action.paneId },
      );
      return focused.activeTabId === tab.id ? focused : { ...focused, activeTabId: tab.id };
    }
    case 'focus-direction': {
      const tab = activeTab(state);
      if (tab === null || tab.zoomedPaneId !== null) return state;
      const target = neighbor(tab.root, tab.activePaneId, action.direction);
      return target === null
        ? state
        : updateTab(state, tab.id, (current) => ({ ...current, activePaneId: target }));
    }
    case 'resize-split':
      return updateTab(state, action.tabId, (tab) => {
        const root = setRatio(tab.root, action.splitId, action.ratio);
        return root === tab.root ? tab : { ...tab, root };
      });
    case 'equalize':
      return updateTab(state, action.tabId, (tab) => ({ ...tab, root: equalize(tab.root) }));
    case 'toggle-zoom': {
      const tab = activeTab(state);
      if (tab === null) return state;
      if (tab.zoomedPaneId === null && tab.root.type === 'pane') return state;
      return updateTab(state, tab.id, (current) => ({
        ...current,
        zoomedPaneId: current.zoomedPaneId === null ? current.activePaneId : null,
      }));
    }
    case 'toggle-broadcast':
      return updateTab(state, action.tabId, (tab) => ({ ...tab, broadcast: !tab.broadcast }));
    case 'restore':
      return action.state;
  }
}
