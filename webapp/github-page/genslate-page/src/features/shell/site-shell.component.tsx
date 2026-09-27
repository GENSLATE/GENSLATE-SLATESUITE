import { useRouter } from '../../app/router/router.context';
import type { RouteView } from '../../app/routes';
import { AppPage } from '../apps/app.page';
import { AppsPage } from '../apps/apps.page';
import { DesignPage } from '../design/design.page';
import { DocPage } from '../docs/doc.page';
import { DocsHomePage } from '../docs/docs-home.page';
import { DownloadPage } from '../download/download.page';
import { HomePage } from '../home/home.page';
import { NotFoundPage } from '../not-found/not-found.page';
import { SiteFooter } from './site-footer.component';
import { SiteHeader } from './site-header.component';
import { useSiteEffects } from './use-site-effects.hook';

function Page({ view }: { readonly view: RouteView }) {
  switch (view.kind) {
    case 'home':
      return <HomePage />;
    case 'apps':
      return <AppsPage />;
    case 'app':
      return <AppPage app={view.app} />;
    case 'design':
      return <DesignPage />;
    case 'download':
      return <DownloadPage />;
    case 'docs-home':
      return <DocsHomePage />;
    case 'doc':
      return <DocPage doc={view.doc} html={view.html} />;
    case 'not-found':
      return <NotFoundPage />;
  }
}

/** Skip link, header, the current page, footer and the navigation announcer. */
export function SiteShell() {
  const { route, announcement } = useRouter();
  useSiteEffects(route.path);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <Page view={route.view} />
      </main>
      <SiteFooter />
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
