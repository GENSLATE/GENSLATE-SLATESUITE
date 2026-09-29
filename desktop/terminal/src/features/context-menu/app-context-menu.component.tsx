import {
  ContextMenuItem,
  ContextMenuSeparator,
  usePlatform,
  WindowContextMenu,
} from '@genslate/design-system';
import { useWindowControls } from '@genslate/tauri-bridge';
import type { ReactNode } from 'react';

import { command, shortcutFor } from '../../app/commands.registry';
import { useTerminal } from '../../app/terminal.context';
import { terminalMenuItems } from './terminal-menu-items.component';

/**
 * Right-click menus for the whole window: tab, file, session, snippet and history rows,
 * Edit commands in text boxes, Theme and window commands on the titlebar, Copy on status
 * items. Panes have their own menu. Dev builds keep the webview's menu on Shift+right-click.
 */
export function AppContextMenu({ children }: { readonly children: ReactNode }) {
  const api = useTerminal();
  const platform = usePlatform();
  const { minimize, toggleMaximize, close } = useWindowControls();

  return (
    <WindowContextMenu
      allowNativeMenu={import.meta.env.DEV}
      onMinimize={() => void minimize()}
      onToggleMaximize={() => void toggleMaximize()}
      onClose={() => void close()}
      onOpenLink={api.openUrl}
      onError={(error) => api.report('Clipboard unavailable', error)}
      items={(target) => {
        if (target.kind !== 'titlebar') return terminalMenuItems(target, api, platform);
        return (
          <>
            {(['new-tab', 'palette', 'settings'] as const).map((id) => {
              const entry = command(id);
              return (
                <ContextMenuItem
                  key={id}
                  icon={entry.icon}
                  shortcut={shortcutFor(entry, platform)}
                  onClick={() => entry.run(api)}
                >
                  {entry.label}
                </ContextMenuItem>
              );
            })}
            <ContextMenuSeparator />
          </>
        );
      }}
    >
      {children}
    </WindowContextMenu>
  );
}
