import {
  IconButton,
  TitleBar,
  TitleBarCommandCenter,
  usePlatform,
  useTheme,
  useWindowState,
} from '@genslate/design-system';
import { useWindowControls } from '@genslate/tauri-bridge';

interface AppTitleBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
}

/** GENSLATE Design Kit titlebar: sidebar toggle + name, command center, theme and settings. */
export function AppTitleBar({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenCommandPalette,
  inspectorOpen,
  onToggleInspector,
}: AppTitleBarProps) {
  const platform = usePlatform();
  const { isFocused, isMaximized, isFullscreen } = useWindowState();
  const { minimize, toggleMaximize, close } = useWindowControls();
  const { resolvedTheme, toggleTheme } = useTheme();
  const nextTheme = resolvedTheme === 'polar-night' ? 'Snow Storm' : 'Polar Night';

  return (
    <TitleBar
      platform={platform}
      isFocused={isFocused}
      isMaximized={isMaximized}
      isFullscreen={isFullscreen}
      onMinimize={() => void minimize()}
      onToggleMaximize={() => void toggleMaximize()}
      onClose={() => void close()}
      leading={
        <div data-tauri-drag-region className="flex min-w-0 items-center gap-1.5">
          <IconButton
            size="sm"
            icon={sidebarCollapsed ? 'codicon:layout-sidebar-left-off' : 'codicon:layout-sidebar-left'}
            label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            tooltip={`${sidebarCollapsed ? 'Show' : 'Hide'} sidebar (${platform === 'macos' ? '⌘B' : 'Ctrl+B'})`}
            onClick={onToggleSidebar}
          />
          <span
            data-tauri-drag-region
            className="truncate-flex pl-1 text-sm font-medium text-titlebar-fg window-inactive:text-titlebar-fg-inactive"
          >
            GENSLATE <span className="font-normal opacity-70">Design Kit</span>
          </span>
        </div>
      }
      center={<TitleBarCommandCenter onClick={onOpenCommandPalette}>Search components…</TitleBarCommandCenter>}
      actions={
        <>
          <IconButton
            size="sm"
            icon={resolvedTheme === 'polar-night' ? 'codicon:color-mode' : 'codicon:lightbulb'}
            label={`Switch to ${nextTheme}`}
            tooltip={`Switch to ${nextTheme} (${platform === 'macos' ? '⌘⇧L' : 'Ctrl+Shift+L'})`}
            onClick={toggleTheme}
          />
          <IconButton
            size="sm"
            icon="codicon:settings-gear"
            label="Appearance and about"
            toggled={inspectorOpen}
            onClick={onToggleInspector}
          />
        </>
      }
    />
  );
}
