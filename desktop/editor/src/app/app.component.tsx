import { AppShell, useHotkey, useTheme } from '@genslate/design-system';
import { useAppInfo } from '@genslate/tauri-bridge';
import { Home } from '../features/home/home.component';
import { AppStatusBar } from '../features/statusbar/app-statusbar.component';
import { AppTitleBar } from '../features/titlebar/app-titlebar.component';
import { APP } from './app.meta';

/** GENSLATE Editor: titlebar · content · status bar. */
export function App() {
  const info = useAppInfo();
  const { toggleTheme } = useTheme();

  useHotkey('mod+shift+l', toggleTheme);

  return (
    <AppShell
      mainLabel={APP.name}
      titleBar={<AppTitleBar />}
      statusBar={<AppStatusBar info={info} />}
    >
      <Home info={info} />
    </AppShell>
  );
}
