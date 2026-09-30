import {
  AppShell,
  Button,
  EmptyState,
  Spinner,
  useHotkey,
  useTheme,
} from '@genslate/design-system';
import { useAppInfo } from '@genslate/tauri-bridge';
import { useEffect, useState } from 'react';

import { AppContextMenu } from '../features/context-menu/app-context-menu.component';
import { GalleryDialogs } from '../features/dialogs/gallery-dialogs.component';
import { Editor } from '../features/editor/editor.component';
import { InfoPanel } from '../features/info/info-panel.component';
import { MediaView } from '../features/library/media-view.component';
import { GalleryPalette } from '../features/palette/gallery-palette.component';
import { SidePanel } from '../features/side-panel/side-panel.component';
import { AppStatusBar } from '../features/statusbar/app-statusbar.component';
import { AppTitleBar } from '../features/titlebar/app-titlebar.component';
import { GalleryToolbar } from '../features/toolbar/gallery-toolbar.component';
import { CompareView } from '../features/viewer/compare-view.component';
import { Slideshow } from '../features/viewer/slideshow.component';
import { Viewer } from '../features/viewer/viewer.component';
import { createBackend } from '../ipc/gallery.client';
import type { GalleryContext } from '../ipc/gallery.types';
import { APP } from './app.meta';
import { errorMessage } from './error-message.util';
import { useGallery } from './gallery.context';
import { GalleryProvider } from './gallery.provider';
import { useCommandHotkeys } from './use-command-hotkeys.hook';

type Startup =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly context: GalleryContext }
  | { readonly status: 'error'; readonly message: string };

/** GENSLATE Gallery: loads the start context, then the gallery window. */
export function App() {
  const [backend] = useState(createBackend);
  const [startup, setStartup] = useState<Startup>({ status: 'loading' });
  const { toggleTheme } = useTheme();

  useHotkey('mod+shift+l', toggleTheme);

  useEffect(() => {
    let active = true;
    backend.context().then(
      (context) => {
        if (active) setStartup({ status: 'ready', context });
      },
      (error: unknown) => {
        if (active) setStartup({ status: 'error', message: errorMessage(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [backend]);

  if (startup.status !== 'ready') {
    return (
      <main
        aria-label={APP.name}
        className="grid h-full place-items-center bg-canvas"
        data-tauri-drag-region
      >
        {startup.status === 'loading' ? (
          <Spinner size={20} label="Opening the library" />
        ) : (
          <EmptyState
            icon="codicon:warning"
            title="Gallery couldn’t start"
            description={startup.message}
            actions={
              <Button size="sm" onClick={() => window.location.reload()}>
                Try again
              </Button>
            }
          />
        )}
      </main>
    );
  }

  return (
    <GalleryProvider backend={backend} context={startup.context}>
      <GalleryWindow />
    </GalleryProvider>
  );
}

/** Titlebar / [side panel | toolbar · photos, or the viewer, editor or compare | info] / status bar. */
function GalleryWindow() {
  const api = useGallery();
  const info = useAppInfo();
  useCommandHotkeys(api);
  const { mode } = api;
  // The editor has its own panel; the info panel sits beside the grid and the viewer.
  const showInfo = api.infoOpen && (mode.type === 'browse' || mode.type === 'view');

  return (
    <AppContextMenu>
      <AppShell
        mainLabel={APP.name}
        persistKey="genslate.gallery.shell"
        titleBar={<AppTitleBar />}
        sidebar={<SidePanel />}
        sidebarCollapsed={!api.sidebarOpen}
        onSidebarCollapsedChange={(collapsed) => api.setSidebarOpen(!collapsed)}
        inspector={showInfo ? <InfoPanel /> : undefined}
        inspectorWidth={300}
        statusBar={<AppStatusBar info={info} />}
      >
        <MainArea />
      </AppShell>
      {mode.type === 'slideshow' ? <Slideshow startId={mode.id} /> : null}
      <GalleryDialogs />
      <GalleryPalette />
    </AppContextMenu>
  );
}

function MainArea() {
  const { mode } = useGallery();
  switch (mode.type) {
    case 'view':
      return <Viewer id={mode.id} />;
    case 'edit':
      return <Editor key={mode.id} id={mode.id} />;
    case 'compare':
      return <CompareView ids={mode.ids} />;
    case 'browse':
    case 'slideshow':
      return (
        <>
          <GalleryToolbar />
          <MediaView />
        </>
      );
  }
}
