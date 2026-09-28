/**
 * What the explorer remembers between runs in the webview's storage: open tabs, favorites and
 * small layout choices. Storage can be missing or full (private windows, locked-down
 * webviews), so every read falls back to a default and every write is best effort.
 */
import type { SortKey, ViewMode } from '../ipc/explorer.types';

const PREFIX = 'genslate.explorer.';

/** A tab as it is saved: where it was and how it looked. */
export interface SavedTab {
  readonly path: string;
  readonly view: ViewMode;
  readonly sortBy: SortKey;
  readonly sortDescending: boolean;
}

export interface SavedSession {
  readonly tabs: readonly SavedTab[];
  readonly active: number;
}

const VIEWS: readonly string[] = ['details', 'icons', 'tiles'] satisfies readonly ViewMode[];
const SORTS: readonly string[] = ['name', 'modified', 'kind', 'size'] satisfies readonly SortKey[];

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    // Unavailable storage or a corrupt value: start fresh.
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Unavailable or full storage: the session simply isn't remembered.
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function parseTab(value: unknown): SavedTab | null {
  if (!isRecord(value)) return null;
  const { path, view, sortBy, sortDescending } = value;
  if (typeof path !== 'string' || path === '') return null;
  if (typeof view !== 'string' || !VIEWS.includes(view)) return null;
  if (typeof sortBy !== 'string' || !SORTS.includes(sortBy)) return null;
  return {
    path,
    view: view as ViewMode,
    sortBy: sortBy as SortKey,
    sortDescending: sortDescending === true,
  };
}

export function loadSession(): SavedSession | null {
  const value = read('session');
  if (!isRecord(value) || !Array.isArray(value['tabs'])) return null;
  const tabs = value['tabs'].map(parseTab).filter((tab): tab is SavedTab => tab !== null);
  if (tabs.length === 0) return null;
  const active = typeof value['active'] === 'number' ? value['active'] : 0;
  return { tabs, active: Math.min(Math.max(0, active), tabs.length - 1) };
}

export function saveSession(session: SavedSession): void {
  write('session', session);
}

export function loadFavorites(): readonly string[] | null {
  const value = read('favorites');
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : null;
}

export function saveFavorites(favorites: readonly string[]): void {
  write('favorites', favorites);
}

/** A small string preference (side panel tab, column widths). */
export function loadPreference(key: string): string | null {
  const value = read(`pref.${key}`);
  return typeof value === 'string' ? value : null;
}

export function savePreference(key: string, value: string): void {
  write(`pref.${key}`, value);
}
