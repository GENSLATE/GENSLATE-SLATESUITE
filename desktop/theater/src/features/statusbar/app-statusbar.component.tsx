import {
  StatusBar,
  StatusBarItem,
  StatusBarSection,
  usePlatform,
  useTheme,
} from '@genslate/design-system';
import { type AppInfo, isTauri } from '@genslate/tauri-bridge';
import { APP } from '../../app/app.meta';

const PLATFORM_NAME = { macos: 'macOS', windows: 'Windows', linux: 'Linux', web: 'Web' } as const;
const THEME_NAME = { 'polar-night': 'Polar Night', 'snow-storm': 'Snow Storm' } as const;
const THEME_ORDER = ['polar-night', 'snow-storm', 'system'] as const;

interface AppStatusBarProps {
  /** Build metadata from the running binary; `null` in a browser. */
  readonly info: AppInfo | null;
}

/** Bottom status bar: app accent, theme, platform · runtime, version. */
export function AppStatusBar({ info }: AppStatusBarProps) {
  const platform = usePlatform();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const tauri = isTauri();

  const cycleTheme = () => {
    setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length] ?? 'system');
  };

  return (
    <StatusBar>
      <StatusBarSection>
        <StatusBarItem accent icon="codicon:remote" label={APP.productName}>
          {APP.productName}
        </StatusBarItem>
        <StatusBarItem
          icon="codicon:color-mode"
          label="Change theme (click to cycle)"
          onClick={cycleTheme}
        >
          {THEME_NAME[resolvedTheme]}
          {theme === 'system' ? ' · System' : ''}
        </StatusBarItem>
        <StatusBarItem icon="codicon:vm" label="Platform">
          {PLATFORM_NAME[platform]}
        </StatusBarItem>
      </StatusBarSection>
      <StatusBarSection align="end">
        <StatusBarItem
          icon={tauri ? 'codicon:vm-running' : 'codicon:globe'}
          label={tauri ? `Tauri ${info?.tauriVersion ?? ''}`.trim() : 'Running in a browser'}
        >
          {tauri ? `Tauri${info ? ` ${info.tauriVersion}` : ''}` : 'Browser'}
        </StatusBarItem>
        <StatusBarItem
          icon="codicon:tag"
          label={info ? `${info.name} ${info.version} (${info.os} ${info.arch})` : 'App version'}
        >
          v{info?.version ?? APP.version}
          {info?.debug ? ' · debug' : ''}
        </StatusBarItem>
      </StatusBarSection>
    </StatusBar>
  );
}
