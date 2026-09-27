/**
 * Pure list logic for the apps well: grouping (Favorites, Recent, categories, Not installed)
 * and ranked search across every source.
 */
import { fuzzyMatch } from '@genslate/design-system';

import type { AppEntry, Source } from '../../ipc/launcher.types';

export type GroupKind = 'favorites' | 'recent' | 'category' | 'unavailable';

export interface AppGroup {
  /** Stable key (`favorites`, `recent`, `category:Media`, `unavailable`). */
  readonly id: string;
  readonly kind: GroupKind;
  readonly label: string;
  readonly apps: readonly AppEntry[];
}

/** Category order for GENSLATE apps; anything else sorts alphabetically after these. */
const CATEGORY_ORDER = ['System', 'Development', 'Office', 'Internet', 'Media', 'Utilities', 'AI'];

/** How many recent apps the Recent group shows. */
export const RECENT_LIMIT = 4;

export function sourceOf(id: string): Source {
  const prefix = id.slice(0, id.indexOf('/'));
  return prefix === 'portableapps' || prefix === 'portapps' ? prefix : 'genslate';
}

export function isLaunchable(app: AppEntry): boolean {
  return app.status === 'ready' || app.status === 'running';
}

/**
 * Groups the visible apps of `source`: Favorites, Recent (not already a favorite), one group
 * per category, and a final group of apps that aren't installed or are broken.
 */
export function groupApps(
  apps: readonly AppEntry[],
  source: Source,
  recentIds: readonly string[],
): AppGroup[] {
  const visible = apps.filter((app) => !app.hidden && sourceOf(app.id) === source);
  const available = visible.filter(isLaunchable);
  const unavailable = visible.filter((app) => !isLaunchable(app));

  const favorites = available.filter((app) => app.favorite);
  const recent = recentIds
    .map((id) => available.find((app) => app.id === id))
    .filter((app): app is AppEntry => app !== undefined && !app.favorite)
    .slice(0, RECENT_LIMIT);

  const byCategory = new Map<string, AppEntry[]>();
  for (const app of available) {
    const category = app.category.trim() || 'Other';
    byCategory.set(category, [...(byCategory.get(category) ?? []), app]);
  }
  const categories = [...byCategory.entries()]
    .sort(([a], [b]) => categoryRank(a) - categoryRank(b) || a.localeCompare(b))
    .map(
      ([label, members]): AppGroup => ({
        id: `category:${label}`,
        kind: 'category',
        label,
        apps: [...members].sort(byName),
      }),
    );

  return [
    ...(favorites.length > 0
      ? [
          {
            id: 'favorites',
            kind: 'favorites',
            label: 'Favorites',
            apps: [...favorites].sort(byName),
          } as const,
        ]
      : []),
    ...(recent.length > 0
      ? [{ id: 'recent', kind: 'recent', label: 'Recent', apps: recent } as const]
      : []),
    ...categories,
    ...(unavailable.length > 0
      ? [
          {
            id: 'unavailable',
            kind: 'unavailable',
            label: 'Not installed',
            apps: [...unavailable].sort(byName),
          } as const,
        ]
      : []),
  ];
}

/** Every app matching `query` (name, key, keywords, category, description), best first. */
export function searchApps(apps: readonly AppEntry[], query: string): AppEntry[] {
  const q = query.trim();
  if (q === '') return [];
  return apps
    .filter((app) => !app.hidden)
    .map((app) => ({ app, score: score(app, q) }))
    .filter((hit): hit is { app: AppEntry; score: number } => hit.score !== null)
    .sort((a, b) => b.score - a.score || byName(a.app, b.app))
    .map((hit) => hit.app);
}

/** Below this length a query must appear as-is (fuzzy "ex" would match half the list). */
const FUZZY_MIN_LENGTH = 3;

function score(app: AppEntry, query: string): number | null {
  const strict = query.length < FUZZY_MIN_LENGTH;
  const match = (text: string) => {
    if (strict && !text.toLowerCase().includes(query.toLowerCase())) return null;
    return fuzzyMatch(query, text);
  };
  const name = match(app.name);
  // Launchable apps first; a name match beats any other field.
  const bonus = isLaunchable(app) ? 5000 : 0;
  if (name !== null) return name.score + 3000 + bonus;
  const key = app.id.slice(app.id.indexOf('/') + 1);
  const other = [key, ...app.keywords, app.category, app.description]
    .map((field) => match(field))
    .filter((match) => match !== null)
    .map((match) => match.score);
  return other.length === 0 ? null : Math.max(...other) + bonus;
}

function categoryRank(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function byName(a: AppEntry, b: AppEntry): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

/** The flat, keyboard-navigable order of a grouped list (collapsed groups contribute nothing). */
export function flatten(groups: readonly AppGroup[], collapsed: ReadonlySet<string>): AppEntry[] {
  return groups.flatMap((group) => (collapsed.has(group.id) ? [] : group.apps));
}
