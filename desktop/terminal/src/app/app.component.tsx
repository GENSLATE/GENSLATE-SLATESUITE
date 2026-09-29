import { AppShell, Button, EmptyState, Spinner } from '@genslate/design-system';
import { useAppInfo } from '@genslate/tauri-bridge';
import { useEffect, useState } from 'react';
import { MONO_FONT_STACK } from '../engine/xterm-theme.util';
import { AppContextMenu } from '../features/context-menu/app-context-menu.component';
import { TerminalDialogs } from '../features/dialogs/terminal-dialogs.component';
import { TerminalPalette } from '../features/palette/terminal-palette.component';
import { PaneGrid } from '../features/panes/pane-grid.component';
import { SidePanel } from '../features/side-panel/side-panel.component';
import { AppStatusBar } from '../features/statusbar/app-statusbar.component';
import { AppTitleBar } from '../features/titlebar/app-titlebar.component';
import { createBackend } from '../ipc/terminal.client';
import type { TerminalContext } from '../ipc/terminal.types';
import { APP } from './app.meta';
import { errorMessage } from './error-message.util';
import { useTerminal } from './terminal.context';
import { TerminalProvider } from './terminal.provider';
import { useCommandHotkeys } from './use-command-hotkeys.hook';

/** Loads JetBrains Mono (regular and bold) before any terminal measures its cells. */
function loadTerminalFont(): Promise<unknown> {
  return Promise.resolve()
    .then(() =>
      Promise.all([
        document.fonts.load(`13px ${MONO_FONT_STACK}`),
        document.fonts.load(`600 13px ${MONO_FONT_STACK}`),
      ]),
    )
    .catch((error: unknown) => {
      // Without the font (or the Font Loading API) the fallback stack still works.
      console.warn('terminal font unavailable', error);
    });
}

type Startup =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly context: TerminalContext }
  | { readonly status: 'error'; readonly message: string };

/**
 * GENSLATE Terminal: loads the shells and settings, waits for the monospace font (xterm
 * measures cells once, so it must be ready first), then opens the terminal window.
 */
export function App() {
  const [backend] = useState(createBackend);
  const [startup, setStartup] = useState<Startup>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    Promise.all([backend.context(), loadTerminalFont()]).then(
      ([context]) => {
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
        className="grid h-full place-items-center bg-terminal-bg"
        data-tauri-drag-region
      >
        {startup.status === 'loading' ? (
          <Spinner size={20} label="Starting the terminal" />
        ) : (
          <EmptyState
            icon="codicon:warning"
            title="The terminal couldn’t start"
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
    <TerminalProvider backend={backend} context={startup.context}>
      <TerminalWindow />
    </TerminalProvider>
  );
}

/** Titlebar with the tabs / [side panel | panes] / status bar. */
function TerminalWindow() {
  const api = useTerminal();
  const info = useAppInfo();
  useCommandHotkeys(api);

  return (
    <AppContextMenu>
      <AppShell
        mainLabel={APP.name}
        persistKey="genslate.terminal.shell"
        titleBar={<AppTitleBar />}
        sidebar={<SidePanel />}
        defaultSidebarWidth={272}
        sidebarCollapsed={!api.sidebarOpen}
        onSidebarCollapsedChange={(collapsed) => api.setSidebarOpen(!collapsed)}
        statusBar={<AppStatusBar info={info} />}
      >
        <PaneGrid />
      </AppShell>
      <TerminalDialogs />
      <TerminalPalette />
    </AppContextMenu>
  );
}
