import { type ReactNode, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { type ResolvedRoute, resolveRoute } from '../routes';
import { runViewTransition } from '../view-transition.util';
import { RouterContext, type RouterValue } from './router.context';
import { stripBase, withBase } from './router.util';

const BASE = import.meta.env.BASE_URL;

type Direction = 'forward' | 'backward';

interface HistoryState {
  readonly idx: number;
}

const readIndex = (state: unknown): number | undefined =>
  typeof state === 'object' && state !== null && 'idx' in state && typeof state.idx === 'number'
    ? state.idx
    : undefined;

/** Resolved routes, shared by hover prefetch and navigation. */
const resolved = new Map<string, Promise<ResolvedRoute>>();
function cachedResolve(path: string): Promise<ResolvedRoute> {
  let entry = resolved.get(path);
  if (!entry) {
    entry = resolveRoute(path);
    resolved.set(path, entry);
    entry.catch(() => resolved.delete(path));
  }
  return entry;
}

function applyMeta(route: ResolvedRoute): void {
  document.title = route.meta.title;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', route.meta.description);
}

function scrollToHash(hash: string): boolean {
  if (!hash) return false;
  const target = document.getElementById(decodeURIComponent(hash));
  if (!target) return false;
  target.scrollIntoView({ block: 'start' });
  return true;
}

/**
 * Client-side navigation over prerendered pages: intercepts same-site link clicks, loads the next
 * route's data, then swaps the page inside a directional view transition. Scroll positions are
 * restored on back/forward, focus moves to the new page's `<main>`, and a live region announces
 * the new title.
 */
export function RouterProvider({
  initial,
  children,
}: {
  readonly initial: ResolvedRoute;
  readonly children: ReactNode;
}) {
  const [route, setRoute] = useState(initial);
  const [announcement, setAnnouncement] = useState('');
  const navigateRef = useRef<(to: string) => void>(() => {});

  useEffect(() => {
    resolved.set(initial.path, Promise.resolve(initial));
    // Prerendered pages already carry their <title>; the dev server's index.html does not.
    applyMeta(initial);
    history.scrollRestoration = 'manual';
    let index = readIndex(history.state) ?? 0;
    if (readIndex(history.state) === undefined) {
      history.replaceState({ idx: index } satisfies HistoryState, '');
    }
    const positions = new Map<number, number>();
    let current = initial.path;
    let token = 0;

    const go = async (
      path: string,
      hash: string,
      mode: 'push' | 'pop',
      direction: Direction,
      restoreY?: number,
    ) => {
      const mine = ++token;
      const next = await cachedResolve(path);
      if (mine !== token) return;

      if (mode === 'push') {
        positions.set(index, window.scrollY);
        index += 1;
        const url = withBase(hash ? `${path}#${hash}` : path, BASE);
        history.pushState({ idx: index } satisfies HistoryState, '', url);
      }
      const samePage = next.path === current;
      current = next.path;

      const commit = () => {
        flushSync(() => setRoute(next));
        applyMeta(next);
        if (restoreY !== undefined) window.scrollTo(0, restoreY);
        else if (!scrollToHash(hash)) window.scrollTo(0, 0);
      };
      if (samePage) {
        commit();
        return;
      }
      runViewTransition(direction, commit);
      setAnnouncement(next.meta.title);
      if (!hash) document.getElementById('main')?.focus({ preventScroll: true });
    };

    navigateRef.current = (to: string) => {
      const [path = '/', hash = ''] = to.split('#', 2);
      void go(path, hash, 'push', 'forward');
    };

    const siteRoute = (anchor: HTMLAnchorElement): string | undefined => {
      if (anchor.target && anchor.target !== '_self') return undefined;
      if (anchor.hasAttribute('download') || anchor.origin !== location.origin) return undefined;
      return stripBase(anchor.pathname, BASE);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const path = siteRoute(anchor);
      if (path === undefined) return;
      const hash = anchor.hash.slice(1);
      // In-page anchors: the browser scrolls and records the history entry.
      if (path === current && hash) return;
      event.preventDefault();
      void go(path, hash, 'push', 'forward');
    };

    const onPopState = (event: PopStateEvent) => {
      const path = stripBase(location.pathname, BASE);
      if (path === undefined) return;
      const nextIndex = readIndex(event.state) ?? 0;
      if (path === current) {
        index = nextIndex;
        return;
      }
      positions.set(index, window.scrollY);
      const direction: Direction = nextIndex < index ? 'backward' : 'forward';
      index = nextIndex;
      void go(path, location.hash.slice(1), 'pop', direction, positions.get(nextIndex) ?? 0);
    };

    // Warm the next page's data (and its docs chunk) on hover or keyboard focus.
    const onIntent = (event: Event) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const path = siteRoute(anchor);
      if (path !== undefined && path !== current) void cachedResolve(path);
    };

    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', onIntent, { passive: true });
    document.addEventListener('focusin', onIntent);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerover', onIntent);
      document.removeEventListener('focusin', onIntent);
      window.removeEventListener('popstate', onPopState);
    };
  }, [initial]);

  const value: RouterValue = {
    route,
    announcement,
    navigate: (to) => navigateRef.current(to),
    href: (to) => withBase(to, BASE),
  };

  return <RouterContext value={value}>{children}</RouterContext>;
}
