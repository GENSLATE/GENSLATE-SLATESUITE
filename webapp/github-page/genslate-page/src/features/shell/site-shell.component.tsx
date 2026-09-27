import { useRouter } from '../../app/router/router.context';
import { SiteFooter } from './site-footer.component';
import { SiteHeader } from './site-header.component';
import { useSiteEffects } from './use-site-effects.hook';

/** Skip link, header, the current page (its chunk already loaded), footer and the announcer. */
export function SiteShell() {
  const { route, announcement } = useRouter();
  useSiteEffects(route.path);
  const Page = route.page;

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
