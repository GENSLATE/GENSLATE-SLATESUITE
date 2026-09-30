import {
  IconButton,
  TitleBar,
  TitleBarCommandCenter,
  usePlatform,
  useTheme,
  useWindowState,
} from '@genslate/design-system';
import { useWindowControls } from '@genslate/tauri-bridge';

import { APP } from '../../app/app.meta';
import { useGallery } from '../../app/gallery.context';
import { collectionTitle } from '../../model/collection.util';
import { AskTeaser } from './ask-teaser.component';

/**
 * Titlebar: side panel toggle, app icon and name · command center (the open collection or
 * photo; opens the palette) · the AI entry point, settings and theme.
 */
export function AppTitleBar() {
  const api = useGallery();
  const platform = usePlatform();
  const { isFocused, isFullscreen } = useWindowState();
  const { minimize, toggleMaximize, close } = useWindowControls();
  const { resolvedTheme, toggleTheme } = useTheme();
  const nextTheme = resolvedTheme === 'polar-night' ? 'Snow Storm' : 'Polar Night';
  const title =
    api.mode.type === 'browse' || api.current === null
      ? collectionTitle(api.collection, api.summary)
      : api.current.name;

  return (
    <TitleBar
      platform={platform}
      isFocused={isFocused}
      isFullscreen={isFullscreen}
      onMinimize={() => void minimize()}
      onToggleMaximize={() => void toggleMaximize()}
      onClose={() => void close()}
      leading={
        <div data-tauri-drag-region className="flex min-w-0 items-center gap-1.5 pl-1">
          <IconButton
            size="sm"
            icon={
              api.sidebarOpen ? 'codicon:layout-sidebar-left' : 'codicon:layout-sidebar-left-off'
            }
            label={api.sidebarOpen ? 'Hide the side panel' : 'Show the side panel'}
            tooltipShortcut="mod+b"
            onClick={() => api.setSidebarOpen(!api.sidebarOpen)}
          />
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
      center={
        <TitleBarCommandCenter onClick={() => api.setPaletteOpen(true)}>
          {title}
        </TitleBarCommandCenter>
      }
      actions={
        <>
          <AskTeaser />
          <IconButton
            size="sm"
            icon={
              api.infoOpen ? 'codicon:layout-sidebar-right' : 'codicon:layout-sidebar-right-off'
            }
            label={api.infoOpen ? 'Hide the info panel' : 'Show the info panel'}
            tooltipShortcut="mod+i"
            onClick={api.toggleInfo}
          />
          <IconButton
            size="sm"
            icon="codicon:settings-gear"
            label="Settings"
            tooltipShortcut="mod+,"
            onClick={() => api.openDialog({ type: 'settings' })}
          />
          <IconButton
            size="sm"
            icon={resolvedTheme === 'polar-night' ? 'codicon:color-mode' : 'codicon:lightbulb'}
            label={`Switch to ${nextTheme}`}
            tooltip={`Switch to ${nextTheme}`}
            tooltipShortcut="mod+shift+l"
            onClick={toggleTheme}
          />
        </>
      }
    />
  );
}
