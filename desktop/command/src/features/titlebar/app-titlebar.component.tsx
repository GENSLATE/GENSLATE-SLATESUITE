import {
  IconButton,
  TitleBar,
  usePlatform,
  useTheme,
  useWindowState,
} from '@genslate/design-system';
import { useWindowControls } from '@genslate/tauri-bridge';
import { APP } from '../../app/app.meta';

/** Titlebar: app icon and name · theme toggle. The empty centre is the drag area. */
export function AppTitleBar() {
  const platform = usePlatform();
  const { isFocused, isFullscreen } = useWindowState();
  const { minimize, toggleMaximize, close } = useWindowControls();
  const { resolvedTheme, toggleTheme } = useTheme();
  const nextTheme = resolvedTheme === 'polar-night' ? 'Snow Storm' : 'Polar Night';

  return (
    <TitleBar
      platform={platform}
      isFocused={isFocused}
      isFullscreen={isFullscreen}
      onMinimize={() => void minimize()}
      onToggleMaximize={() => void toggleMaximize()}
      onClose={() => void close()}
      leading={
        <div data-tauri-drag-region className="flex min-w-0 items-center gap-2 pl-1">
          <img
            src={APP.icon}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none size-icon-lg shrink-0"
          />
          <span
            data-tauri-drag-region
            className="truncate-flex font-medium text-sm text-titlebar-fg window-inactive:text-titlebar-fg-inactive"
          >
            GENSLATE <span className="font-normal opacity-70">{APP.name}</span>
          </span>
        </div>
      }
      actions={
        <IconButton
          size="sm"
          icon={resolvedTheme === 'polar-night' ? 'codicon:color-mode' : 'codicon:lightbulb'}
          label={`Switch to ${nextTheme}`}
          tooltip={`Switch to ${nextTheme}`}
          tooltipShortcut="mod+shift+l"
          onClick={toggleTheme}
        />
      }
    />
  );
}
