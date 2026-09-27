/**
 * Path helpers for a site served under a base path (`/GENSLATE/` on GitHub Pages).
 * Routes are base-relative with a leading and a trailing slash — `/apps/terminal/` — matching the
 * `apps/terminal/index.html` files GitHub Pages serves.
 */

/** `apps/terminal` → `/apps/terminal/`; keeps `/`. */
export function normalizePath(path: string): string {
  const trimmed = path.replace(/\/{2,}/g, '/').replace(/^\/|\/$/g, '');
  return trimmed === '' ? '/' : `/${trimmed}/`;
}

/** The base-relative route of a pathname, or undefined when it is outside the site. */
export function stripBase(pathname: string, base: string): string | undefined {
  if (pathname === base.slice(0, -1)) return '/';
  if (!pathname.startsWith(base)) return undefined;
  return normalizePath(pathname.slice(base.length - 1).replace(/index\.html$/, ''));
}

/** A route (optionally with `#hash`) → an href under `base`. */
export function withBase(route: string, base: string): string {
  const [path = '/', hash] = route.split('#', 2);
  const href = base + normalizePath(path).slice(1);
  return hash ? `${href}#${hash}` : href;
}
