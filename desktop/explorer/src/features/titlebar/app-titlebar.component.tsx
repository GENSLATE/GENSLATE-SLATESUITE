import {
  Badge,
  Button,
  IconButton,
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
  TitleBar,
  TitleBarCommandCenter,
  usePlatform,
  useTheme,
  useWindowState,
} from '@genslate/design-system';
import { useWindowControls } from '@genslate/tauri-bridge';
import { useState } from 'react';

import { APP } from '../../app/app.meta';
import { runCommand } from '../../app/commands.registry';
import { useExplorer } from '../../app/explorer.context';
import { baseName } from '../../model/path.util';

/**
 * Titlebar: side panel toggle, app icon and name · command center (the current folder; opens
 * the palette) · the AI entry point, settings and theme.
 */
export function AppTitleBar() {
  const api = useExplorer();
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
          {api.tab.search === null ? baseName(api.tab.path) : `Search: ${api.tab.search.text}`}
        </TitleBarCommandCenter>
      }
      actions={
        <>
          <AskTeaser />
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

/**
 * The AI entry point, reserved: a sparkle that explains what is coming and opens the Chat
 * preview. Every explorer action is already a typed command the assistant will run.
 */
function AskTeaser() {
  const api = useExplorer();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <IconButton
            size="sm"
            icon="codicon:sparkle"
            label="Ask about your files"
            tooltip="Ask about your files · coming soon"
            toggled={open}
          />
        }
      />
      <PopoverPopup side="bottom" align="end" sideOffset={8} className="w-80">
        <div className="flex items-center gap-2">
          <PopoverTitle className="text-fg-strong">Ask about your files</PopoverTitle>
          <Badge tone="accent" size="sm" pill>
            Coming soon
          </Badge>
        </div>
        <PopoverDescription className="mt-1.5 text-fg-secondary text-sm">
          “Find the contract I signed in March”, “what is filling up Downloads?”, “sort these photos
          into folders by trip”. The assistant will search inside your files and run Explorer’s
          commands for you, asking before it changes anything.
        </PopoverDescription>
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            leadingIcon="codicon:chat-sparkle"
            onClick={() => {
              setOpen(false);
              runCommand('ask', api);
            }}
          >
            Preview the chat
          </Button>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
