import '@genslate/design-system/fonts.css';
import './styles/main.css';

import { StrictMode, Suspense, use } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/app.component';
import { AppProviders } from './app/app.providers';
import { type Boot, LauncherProvider } from './app/launcher.provider';
import { createBackend } from './ipc/launcher.client';

/** Loads everything the first frame needs: backend, context (settings, commands, layout), apps. */
async function boot(): Promise<Boot> {
  const backend = await createBackend();
  const [context, list] = await Promise.all([backend.context(), backend.listApps()]);
  // The shell hit-tests the frame with the same geometry the CSS draws.
  const root = document.documentElement.style;
  root.setProperty('--launcher-inset', `${context.layout.inset}px`);
  root.setProperty('--launcher-normal', `${context.layout.normalWidth}px`);
  root.setProperty('--launcher-expanded', `${context.layout.expandedWidth}px`);
  return { backend, context, list };
}

const booting = boot();

function Root() {
  const loaded = use(booting);
  return (
    <LauncherProvider boot={loaded}>
      <AppProviders>
        <App />
      </AppProviders>
    </LauncherProvider>
  );
}

const container = document.getElementById('root');
if (container === null) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </StrictMode>,
);
