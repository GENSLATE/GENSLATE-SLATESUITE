import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';

import { App } from './app/app.component';
import { type ResolvedRoute, resolveRoute, staticPaths } from './app/routes';

export interface RenderedPage {
  readonly route: ResolvedRoute;
  readonly html: string;
}

/** Prerenders one route (used by scripts/build-site.ts). */
export async function render(path: string): Promise<RenderedPage> {
  const route = await resolveRoute(path);
  const html = renderToString(
    <StrictMode>
      <App initial={route} />
    </StrictMode>,
  );
  return { route, html };
}

export { staticPaths };
