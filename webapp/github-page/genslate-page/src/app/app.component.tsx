import { DesignSystemProvider, TooltipProvider } from '@genslate/design-system';

import { SiteShell } from '../features/shell/site-shell.component';
import { RouterProvider } from './router/router.provider';
import type { ResolvedRoute } from './routes';

/** The website: design-system providers, the router and the page shell. */
export function App({ initial }: { readonly initial: ResolvedRoute }) {
  return (
    <DesignSystemProvider platform="web" windowState={{ isFocused: true }}>
      <TooltipProvider>
        <RouterProvider initial={initial}>
          <SiteShell />
        </RouterProvider>
      </TooltipProvider>
    </DesignSystemProvider>
  );
}
