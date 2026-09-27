import type { ComponentType } from 'react';

import type { RouteView } from './routes';

/** A page rendered from its route view. */
export type PageComponent = ComponentType<{ readonly view: RouteView }>;

type Kind = RouteView['kind'];

/**
 * One chunk per page, loaded by `resolveRoute` before hydration or navigation (and warmed on
 * link hover), so the docs never download the app mockups and vice versa.
 */
const LOADERS: Readonly<Record<Kind, () => Promise<PageComponent>>> = {
  home: () => import('../features/home/home.page').then(({ HomePage }) => HomePage),
  apps: () => import('../features/apps/apps.page').then(({ AppsPage }) => AppsPage),
  app: () =>
    import('../features/apps/app.page').then(({ AppPage }) => {
      const Page: PageComponent = ({ view }) =>
        view.kind === 'app' ? <AppPage app={view.app} /> : null;
      return Page;
    }),
  design: () => import('../features/design/design.page').then(({ DesignPage }) => DesignPage),
  download: () =>
    import('../features/download/download.page').then(({ DownloadPage }) => DownloadPage),
  'docs-home': () =>
    import('../features/docs/docs-home.page').then(({ DocsHomePage }) => DocsHomePage),
  doc: () =>
    import('../features/docs/doc.page').then(({ DocPage }) => {
      const Page: PageComponent = ({ view }) =>
        view.kind === 'doc' ? <DocPage doc={view.doc} html={view.html} /> : null;
      return Page;
    }),
  'not-found': () =>
    import('../features/not-found/not-found.page').then(({ NotFoundPage }) => NotFoundPage),
};

// Stable component identity per kind (a new wrapper per load would remount the page).
const loaded = new Map<Kind, Promise<PageComponent>>();

export function loadPage(kind: Kind): Promise<PageComponent> {
  let page = loaded.get(kind);
  if (!page) {
    page = LOADERS[kind]();
    loaded.set(kind, page);
    page.catch(() => loaded.delete(kind));
  }
  return page;
}
