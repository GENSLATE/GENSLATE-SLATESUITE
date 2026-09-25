import '@genslate/design-system/fonts.css';
import './styles/main.css';

import { AppShell, DesignSystemProvider, StatusBar, StatusBarItem, TitleBar } from '@genslate/design-system';
import { detectPlatform, useWindowControls } from '@genslate/tauri-bridge';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const platform = detectPlatform();

function App() {
  const controls = useWindowControls();
  const windowState = {
    isFocused: controls.isFocused,
    isMaximized: controls.isMaximized,
    isFullscreen: controls.isFullscreen,
  };

  return (
    <DesignSystemProvider platform={platform} windowState={windowState}>
      <AppShell
        titleBar={
          <TitleBar
            title="{{ title }}"
            platform={platform}
            isFocused={controls.isFocused}
            isMaximized={controls.isMaximized}
            onMinimize={controls.minimize}
            onToggleMaximize={controls.toggleMaximize}
            onClose={controls.close}
          />
        }
        statusBar={
          <StatusBar>
            <StatusBarItem>Ready</StatusBarItem>
          </StatusBar>
        }
      >
        <main className="grid h-full place-items-center p-6 text-fg-secondary">{{ title }}</main>
      </AppShell>
    </DesignSystemProvider>
  );
}

const root = document.getElementById('root');
if (root === null) throw new Error('#root is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
