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
import { ExplorerDialogs } from '../features/dialogs/explorer-dialogs.component';
import { FileView } from '../features/files/file-view.component';
import { ExplorerToolbar } from '../features/navigation/explorer-toolbar.component';
import { NavBar } from '../features/navigation/nav-bar.component';
import { ExplorerPalette } from '../features/palette/explorer-palette.component';
import { PreviewPane } from '../features/preview/preview-pane.component';
import { SidePanel } from '../features/side-panel/side-panel.component';
import { AppStatusBar } from '../features/statusbar/app-statusbar.component';
import { TabStrip } from '../features/tabs/tab-strip.component';
import { AppTitleBar } from '../features/titlebar/app-titlebar.component';
import { createBackend } from '../ipc/explorer.client';
import type { ExplorerContext } from '../ipc/explorer.types';
import { APP } from './app.meta';
import { errorMessage } from './error-message.util';
import { useExplorer } from './explorer.context';
import { ExplorerProvider } from './explorer.provider';
import { useCommandHotkeys } from './use-command-hotkeys.hook';

type Startup =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly context: ExplorerContext }
  | { readonly status: 'error'; readonly message: string };

/** GENSLATE Explorer: loads the start context, then the explorer window. */
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
          <Spinner size={20} label="Starting the explorer" />
        ) : (
          <EmptyState
            icon="codicon:warning"
            title="The explorer couldn’t start"
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
    <ExplorerProvider backend={backend} context={startup.context}>
      <ExplorerWindow />
    </ExplorerProvider>
  );
}

/** Titlebar / [side panel | tabs · navigation · toolbar · files | preview] / status bar. */
function ExplorerWindow() {
  const api = useExplorer();
  const info = useAppInfo();
  useCommandHotkeys(api);

  return (
    <AppContextMenu>
      <AppShell
        mainLabel={APP.name}
        persistKey="genslate.explorer.shell"
        titleBar={<AppTitleBar />}
        sidebar={<SidePanel />}
        sidebarCollapsed={!api.sidebarOpen}
        onSidebarCollapsedChange={(collapsed) => api.setSidebarOpen(!collapsed)}
        inspector={api.previewOpen ? <PreviewPane /> : undefined}
        inspectorWidth={300}
        statusBar={<AppStatusBar info={info} />}
      >
        <TabStrip />
        <NavBar />
        <ExplorerToolbar />
        <FileView />
      </AppShell>
      <ExplorerDialogs />
      <ExplorerPalette />
    </AppContextMenu>
  );
}
