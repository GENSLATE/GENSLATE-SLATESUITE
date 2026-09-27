import type { AppEntry, AppList, LauncherContext } from '../../ipc/launcher.types';

/** How many apps the Recent submenu lists. */
export const TRAY_RECENT_LIMIT = 5;

/** Recently launched apps that still exist and aren't hidden, newest first. */
export function recentApps(list: AppList, limit = TRAY_RECENT_LIMIT): readonly AppEntry[] {
  const byId = new Map(list.apps.map((app) => [app.id, app]));
  return list.recent
    .map((id) => byId.get(id))
    .filter((app): app is AppEntry => app !== undefined && !app.hidden)
    .slice(0, limit);
}

/** Favorite apps that aren't hidden, by name. */
export function favoriteApps(list: AppList): readonly AppEntry[] {
  return list.apps
    .filter((app) => app.favorite && !app.hidden)
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

/** The header's second line: where this launcher runs from. */
export function describeInstall(context: Pick<LauncherContext, 'mode' | 'suiteName'>): string {
  switch (context.mode) {
    case 'suite':
      return context.suiteName === null ? 'Portable suite' : `Suite · ${context.suiteName}`;
    case 'standalone':
      return 'Standalone';
    case 'dev':
      return 'Development build';
    case 'fallback':
      return 'Portable (fallback folders)';
    case 'web':
      return context.suiteName === null ? 'Browser preview' : `Preview · ${context.suiteName}`;
  }
}
