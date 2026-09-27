import { type ReactNode, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { type ResolvedRoute, resolveRoute } from '../routes';
import { RouterContext, type RouterValue } from './router.context';
import { stripBase, withBase } from './router.util';

const BASE = import.meta.env.BASE_URL;

type Direction = 'forward' | 'backward' | 'none';

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

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** `startViewTransition({ update, types })` — the object form needs View Transition types. */
const supportsTypes = () =>
  typeof CSS !== 'undefined' && CSS.supports('selector(:active-view-transition-type(a))');

/** Runs `update` inside a view transition when the browser (and the user) allow it. */
export function withViewTransition(update: () => void, types: readonly string[] = []): void {
  if (typeof document.startViewTransition !== 'function' || reducedMotion()) {
    update();
    return;
  }
  if (supportsTypes()) document.startViewTransition({ update, types: [...types] });
  else document.startViewTransition(update);
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
  target.focus({ preventScroll: true });
  return true;
}

/**
 * Client-side navigation over prerendered pages: intercepts same-site link clicks, loads the next
 * route's data, then swaps the page inside a directional view transition. Scroll positions are
 * restored on back/forward and focus moves to the new page's `<main>`.
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
        history.pushState(
          { idx: index } satisfies HistoryState,
          '',
          withBase(`${path}#${hash}`, BASE).replace(/#$/, ''),
        );
      }
      const samePage = next.path === current;
      current = next.path;

      const commit = () => {
        flushSync(() => setRoute(next));
        applyMeta(next);
        if (restoreY !== undefined) window.scrollTo(0, restoreY);
        else if (!scrollToHash(hash)) window.scrollTo(0, 0);
      };
      if (samePage) commit();
      else withViewTransition(commit, [direction]);

      if (!samePage) {
        setAnnouncement(next.meta.title);
        if (!hash) document.getElementById('main')?.focus({ preventScroll: true });
      }
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
      // In-page anchors: let the browser scroll (and add the history entry).
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

    // Warm the next page's data (and docs chunk) on hover or focus.
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
  }, [initial.path]);

  const value: RouterValue = {
    route,
    announcement,
    navigate: (to) => navigateRef.current(to),
    href: (to) => withBase(to, BASE),
  };

  return <RouterContext value={value}>{children}</RouterContext>;
}
