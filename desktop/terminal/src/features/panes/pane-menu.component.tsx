import {
  Badge,
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuTrigger,
  usePlatform,
} from '@genslate/design-system';
import { type ReactNode, useState } from 'react';

import { command, isEnabled, shortcutFor } from '../../app/commands.registry';
import { useTerminal } from '../../app/terminal.context';

/** The commands a pane's menu lists, in groups. */
const GROUPS = [
  ['copy', 'paste', 'select-all'],
  ['find', 'clear', 'copy-last-output', 'save-output'],
  ['split-right', 'split-down', 'zoom-pane', 'broadcast'],
] as const;

/**
 * Right-click in a terminal: its own menu (the terminal's text box would otherwise get the
 * text-field menu). With "Right-click pastes" on, it copies the selection or pastes instead,
 * like Windows Terminal.
 */
export function PaneMenu({
  paneId,
  children,
}: {
  readonly paneId: string;
  readonly children: ReactNode;
}) {
  const api = useTerminal();
  const platform = usePlatform();
  const [open, setOpen] = useState(false);

  if (api.settings.rightClick === 'paste') {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut for Copy/Paste, which the keyboard already has
      <div
        className="flex min-h-0 flex-1 flex-col"
        onContextMenu={(event) => {
          event.preventDefault();
          const session = api.session(paneId);
          if (session?.hasSelection() === true) {
            session.copySelection();
            session.term.clearSelection();
          } else {
            api.focusPane(paneId);
            api.pasteFromClipboard();
          }
        }}
      >
        {children}
      </div>
    );
  }

  const run = (id: string) => command(id).run(api);
  const state = api.store.get(paneId);
  const failed =
    state?.lastCommand != null &&
    state.lastCommand.exitCode !== null &&
    state.lastCommand.exitCode !== 0;

  return (
    <ContextMenu
      onOpenChange={(next) => {
        // Commands act on the active pane: right-clicking a pane makes it active first.
        if (next) api.dispatch({ type: 'focus-pane', paneId });
        setOpen(next);
      }}
    >
      <ContextMenuTrigger className="flex min-h-0 flex-1 flex-col">{children}</ContextMenuTrigger>
      <ContextMenuPopup className="min-w-60">
        {open
          ? GROUPS.map((group, index) => (
              <div key={group[0]} className="contents">
                {index > 0 ? <ContextMenuSeparator /> : null}
                {group.map((id) => {
                  const entry = command(id);
                  return (
                    <ContextMenuItem
                      key={id}
                      icon={entry.icon}
                      shortcut={shortcutFor(entry, platform)}
                      disabled={!isEnabled(entry, api)}
                      onClick={() => run(id)}
                    >
                      {id === 'broadcast' && api.tab?.broadcast === true
                        ? 'Stop typing in every pane'
                        : id === 'zoom-pane' && api.tab?.zoomedPaneId === paneId
                          ? 'Restore the panes'
                          : entry.label}
                    </ContextMenuItem>
                  );
                })}
              </div>
            ))
          : null}
        <ContextMenuSeparator />
        <ContextMenuItem
          icon="codicon:sparkle"
          disabled={!failed}
          onClick={() =>
            api.askAssistant({ paneId, command: api.store.get(paneId)?.lastCommand ?? null })
          }
        >
          <span className="flex items-center gap-2">
            Explain the last error
            <Badge tone="accent" size="sm" pill>
              Soon
            </Badge>
          </span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          icon="codicon:close"
          tone="danger"
          shortcut={shortcutFor(command('close-pane'), platform)}
          onClick={() => api.closePane(paneId)}
        >
          Close pane
        </ContextMenuItem>
      </ContextMenuPopup>
    </ContextMenu>
  );
}
