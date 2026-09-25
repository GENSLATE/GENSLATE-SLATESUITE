import { StatusBar, StatusBarItem, StatusBarSection, usePlatform, useTheme } from '@genslate/design-system';
import { type AppInfo, commands, isTauri } from '@genslate/tauri-bridge';
import { useEffect, useState } from 'react';
import pkg from '../../../package.json';

const PLATFORM_NAME = { macos: 'macOS', windows: 'Windows', linux: 'Linux', web: 'Web' } as const;
const THEME_NAME = { 'polar-night': 'Polar Night', 'snow-storm': 'Snow Storm' } as const;

interface AppStatusBarProps {
  pageCount: number;
  onOpenInspector: () => void;
}

/** Bottom status bar: brand accent, theme, platform · pages, runtime, version. */
export function AppStatusBar({ pageCount, onOpenInspector }: AppStatusBarProps) {
  const platform = usePlatform();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const tauri = isTauri();

  useEffect(() => {
    let active = true;
    commands.appInfo().then(
      (next) => {
        if (active) setInfo(next);
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);

  const cycleTheme = () => {
    const order = ['polar-night', 'snow-storm', 'system'] as const;
    setTheme(order[(order.indexOf(theme) + 1) % order.length] ?? 'system');
  };

  return (
    <StatusBar>
      <StatusBarSection>
        <StatusBarItem accent icon="codicon:remote" label="GENSLATE Design Kit" onClick={onOpenInspector}>
          GENSLATE
        </StatusBarItem>
        <StatusBarItem icon="codicon:color-mode" label="Change theme (click to cycle)" onClick={cycleTheme}>
          {THEME_NAME[resolvedTheme]}
          {theme === 'system' ? ' · System' : ''}
        </StatusBarItem>
        <StatusBarItem icon="codicon:device-desktop" label="Platform">
          {PLATFORM_NAME[platform]}
        </StatusBarItem>
      </StatusBarSection>
      <StatusBarSection align="end">
        <StatusBarItem icon="codicon:symbol-misc" label="Showcase pages">
          {pageCount} pages
        </StatusBarItem>
        <StatusBarItem
          icon={tauri ? 'codicon:vm-running' : 'codicon:globe'}
          label={tauri ? `Tauri ${info?.tauriVersion ?? ''}`.trim() : 'Running in a browser'}
        >
          {tauri ? `Tauri${info ? ` ${info.tauriVersion}` : ''}` : 'Browser'}
        </StatusBarItem>
        <StatusBarItem label={info ? `${info.name} ${info.version} (${info.os} ${info.arch})` : 'App version'}>
          v{info?.version ?? pkg.version}
          {info?.debug ? ' · debug' : ''}
        </StatusBarItem>
        <StatusBarItem icon="codicon:bell" label="No notifications" onClick={() => undefined} />
      </StatusBarSection>
    </StatusBar>
  );
}
