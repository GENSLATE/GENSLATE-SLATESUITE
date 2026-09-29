/**
 * What the terminal remembers between runs in the webview's storage (portable: it lives in
 * the app's cache folder): the tabs, their splits, profiles and folders, plus a few hundred
 * lines of each pane's scrollback. Storage can be missing or full, so every read falls back
 * and every write is best effort.
 */
import type { ProfileColor } from '../ipc/terminal.types';
import type { LayoutState, TabState } from '../model/layout.reducer';
import { leaves, type PaneLeaf, type PaneNode } from '../model/pane-tree.util';

const PREFIX = 'genslate.terminal.';
const SCROLLBACK = `${PREFIX}scrollback.`;
/** Lines of scrollback kept per pane. */
export const RESTORED_LINES = 400;
/** Characters kept per pane (storage is small). */
const MAX_SCROLLBACK_CHARS = 120_000;

const COLORS: readonly string[] = [
  'frost',
  'aurora-red',
  'aurora-orange',
  'aurora-yellow',
  'aurora-green',
  'aurora-purple',
] satisfies readonly ProfileColor[];

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    // Unavailable storage or a corrupt value: start fresh.
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Unavailable or full storage: this part of the session simply isn't remembered.
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clean up without storage.
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function parseNode(value: unknown, validProfile: (id: string) => boolean): PaneNode | null {
  if (!isRecord(value)) return null;
  if (value['type'] === 'pane') {
    const { id, profileId, cwd } = value;
    if (typeof id !== 'string' || typeof profileId !== 'string' || !validProfile(profileId)) {
      return null;
    }
    return { type: 'pane', id, profileId, cwd: typeof cwd === 'string' ? cwd : null };
  }
  if (value['type'] === 'split') {
    const { id, direction, ratio } = value;
    if (typeof id !== 'string' || (direction !== 'row' && direction !== 'column')) return null;
    const first = parseNode(value['first'], validProfile);
    const second = parseNode(value['second'], validProfile);
    // A pane whose profile vanished drops out; its sibling takes the space.
    if (first === null) return second;
    if (second === null) return first;
    const share = typeof ratio === 'number' && ratio >= 0.1 && ratio <= 0.9 ? ratio : 0.5;
    return { type: 'split', id, direction, ratio: share, first, second };
  }
  return null;
}

function parseTab(value: unknown, validProfile: (id: string) => boolean): TabState | null {
  if (!isRecord(value) || typeof value['id'] !== 'string') return null;
  const root = parseNode(value['root'], validProfile);
  if (root === null) return null;
  const panes = leaves(root);
  const active = panes.find((pane) => pane.id === value['activePaneId']) ?? panes[0];
  if (active === undefined) return null;
  const color = value['color'];
  return {
    id: value['id'],
    root,
    activePaneId: active.id,
    zoomedPaneId: null,
    title: typeof value['title'] === 'string' && value['title'] !== '' ? value['title'] : null,
    color: typeof color === 'string' && COLORS.includes(color) ? (color as ProfileColor) : null,
    broadcast: false,
  };
}

/** The last session's layout, or `null` (nothing saved, or nothing usable). */
export function loadLayout(validProfile: (id: string) => boolean): LayoutState | null {
  const saved = read(`${PREFIX}layout`);
  if (!isRecord(saved) || !Array.isArray(saved['tabs'])) return null;
  const tabs = saved['tabs']
    .map((tab) => parseTab(tab, validProfile))
    .filter((tab): tab is TabState => tab !== null);
  if (tabs.length === 0) return null;
  const active = tabs.find((tab) => tab.id === saved['activeTabId']) ?? tabs[0];
  return { tabs, activeTabId: active?.id ?? null };
}

/** Saves the layout with each pane's current folder (so it reopens where it was). */
export function saveLayout(state: LayoutState, cwdOf: (paneId: string) => string | null): void {
  const withCwd = (node: PaneNode): PaneNode =>
    node.type === 'pane'
      ? ({ ...node, cwd: cwdOf(node.id) ?? node.cwd } satisfies PaneLeaf)
      : { ...node, first: withCwd(node.first), second: withCwd(node.second) };
  write(`${PREFIX}layout`, {
    tabs: state.tabs.map((tab) => ({
      id: tab.id,
      root: withCwd(tab.root),
      activePaneId: tab.activePaneId,
      title: tab.title,
      color: tab.color,
    })),
    activeTabId: state.activeTabId,
  });
}

export function forgetLayout(): void {
  remove(`${PREFIX}layout`);
}

export function loadScrollback(paneId: string): string | null {
  const saved = read(`${SCROLLBACK}${paneId}`);
  return typeof saved === 'string' && saved !== '' ? saved : null;
}

/** Keeps the scrollback of `panes` and drops every other pane's. */
export function saveScrollback(panes: ReadonlyMap<string, string>): void {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(SCROLLBACK) === true && !panes.has(key.slice(SCROLLBACK.length))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Without storage there is nothing to prune.
  }
  for (const [id, text] of panes) write(`${SCROLLBACK}${id}`, text.slice(-MAX_SCROLLBACK_CHARS));
}

/** Small UI choices: the side panel's tab and whether it is open, its width. */
export interface UiPrefs {
  readonly sidePanel: string;
  readonly sidebarOpen: boolean;
}

export function loadUiPrefs(): UiPrefs | null {
  const saved = read(`${PREFIX}ui`);
  if (!isRecord(saved) || typeof saved['sidePanel'] !== 'string') return null;
  return { sidePanel: saved['sidePanel'], sidebarOpen: saved['sidebarOpen'] !== false };
}

export function saveUiPrefs(prefs: UiPrefs): void {
  write(`${PREFIX}ui`, prefs);
}
