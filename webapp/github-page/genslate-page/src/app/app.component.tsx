import {
  DesignSystemProvider,
  ToastProvider,
  ToastViewport,
  TooltipProvider,
} from '@genslate/design-system';

import { SiteShell } from '../features/shell/site-shell.component';
import { RouterProvider } from './router/router.provider';
import type { ResolvedRoute } from './routes';

/** The website: design-system providers, the router and the page shell. */
export function App({ initial }: { readonly initial: ResolvedRoute }) {
  return (
    <DesignSystemProvider platform="web" windowState={{ isFocused: true }}>
      <TooltipProvider>
        <ToastProvider>
          <RouterProvider initial={initial}>
            <SiteShell />
          </RouterProvider>
          <ToastViewport />
        </ToastProvider>
      </TooltipProvider>
    </DesignSystemProvider>
  );
}
