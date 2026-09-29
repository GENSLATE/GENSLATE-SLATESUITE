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
  usePlatform,
  useTheme,
  useWindowState,
} from '@genslate/design-system';
import { useWindowControls } from '@genslate/tauri-bridge';
import { useState } from 'react';

import { command, runCommand, shortcutFor } from '../../app/commands.registry';
import { useTerminal } from '../../app/terminal.context';
import { TabStrip } from '../tabs/tab-strip.component';

/**
 * Titlebar: the side panel toggle and the tabs (Windows Terminal style, no title in the
 * middle) · the assistant, the command palette, settings and theme.
 */
export function AppTitleBar() {
  const api = useTerminal();
  const platform = usePlatform();
  const { isFocused, isFullscreen } = useWindowState();
  const { minimize, toggleMaximize, close } = useWindowControls();
  const { resolvedTheme } = useTheme();
  const nextTheme = resolvedTheme === 'polar-night' ? 'Snow Storm' : 'Polar Night';
  const keys = (id: string) => shortcutFor(command(id), platform);

  return (
    <TitleBar
      platform={platform}
      isFocused={isFocused}
      isFullscreen={isFullscreen}
      onMinimize={() => void minimize()}
      onToggleMaximize={() => void toggleMaximize()}
      onClose={() => void close()}
      // The tabs take the whole start; nothing sits in the middle.
      className="grid-cols-[minmax(0,1fr)_0_auto]"
      center={<span />}
      leading={
        <div className="flex h-full min-w-0 flex-1 items-center gap-1 pl-1">
          <IconButton
            size="sm"
            icon={
              api.sidebarOpen ? 'codicon:layout-sidebar-left' : 'codicon:layout-sidebar-left-off'
            }
            label={api.sidebarOpen ? 'Hide the side panel' : 'Show the side panel'}
            tooltipShortcut={keys('toggle-sidebar')}
            onClick={() => api.setSidebarOpen(!api.sidebarOpen)}
            className="shrink-0"
          />
          <TabStrip />
        </div>
      }
      actions={
        <>
          <AskTeaser />
          <IconButton
            size="sm"
            icon="codicon:terminal"
            label="Command palette"
            tooltipShortcut={keys('palette')}
            onClick={() => api.setPaletteOpen(true)}
          />
          <IconButton
            size="sm"
            icon="codicon:settings-gear"
            label="Settings"
            tooltipShortcut={keys('settings')}
            onClick={() => api.openDialog({ type: 'settings' })}
          />
          <IconButton
            size="sm"
            icon={resolvedTheme === 'polar-night' ? 'codicon:color-mode' : 'codicon:lightbulb'}
            label={`Switch to ${nextTheme}`}
            tooltipShortcut={keys('toggle-theme')}
            onClick={api.toggleTheme}
          />
        </>
      }
    />
  );
}

/**
 * The assistant's entry point, reserved: explains what is coming and opens the Assistant
 * preview in the side panel.
 */
function AskTeaser() {
  const api = useTerminal();
  const platform = usePlatform();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <IconButton
            size="sm"
            icon="codicon:sparkle"
            label="Ask the assistant"
            tooltip="Ask the assistant · coming soon"
            tooltipShortcut={shortcutFor(command('ask'), platform)}
            toggled={open}
          />
        }
      />
      <PopoverPopup side="bottom" align="end" sideOffset={8} className="w-80">
        <div className="flex items-center gap-2">
          <PopoverTitle className="text-fg-strong">An assistant in your shell</PopoverTitle>
          <Badge tone="accent" size="sm" pill>
            Coming soon
          </Badge>
        </div>
        <PopoverDescription className="mt-1.5 text-fg-secondary text-sm">
          “Why did this build fail?”, “find what is using port 3000”, “turn today’s commands into a
          script”. It will read the output you see, suggest commands and explain errors, and it
          always shows a command before it runs it. Type # at an empty prompt to try the command
          bar.
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
            Preview the assistant
          </Button>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
