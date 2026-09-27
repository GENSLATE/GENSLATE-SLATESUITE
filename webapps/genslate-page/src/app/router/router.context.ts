import { createContext, use } from 'react';

import type { ResolvedRoute } from '../routes';

export interface RouterValue {
  readonly route: ResolvedRoute;
  /** Text for the polite live region after a client-side navigation. */
  readonly announcement: string;
  /** Navigates to a base-relative route (`/docs/launcher/#themes`). */
  readonly navigate: (to: string) => void;
  /** A base-relative route → an href under the site base. */
  readonly href: (to: string) => string;
}

export const RouterContext = createContext<RouterValue | null>(null);
RouterContext.displayName = 'RouterContext';

export function useRouter(): RouterValue {
  const value = use(RouterContext);
  if (!value) throw new Error('useRouter() must be used inside <RouterProvider>.');
  return value;
}
