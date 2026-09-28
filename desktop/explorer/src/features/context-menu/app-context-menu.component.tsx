import {
  ContextMenuItem,
  ContextMenuSeparator,
  usePlatform,
  WindowContextMenu,
} from '@genslate/design-system';
import { commands, useWindowControls } from '@genslate/tauri-bridge';
import type { ReactNode } from 'react';

import { command } from '../../app/commands.registry';
import { useExplorer } from '../../app/explorer.context';
import { explorerMenuItems } from './explorer-menu-items.component';

/**
 * Right-click menus for the whole window: file and folder commands in the file views, tab and
 * place commands, Edit commands in text boxes, Theme and window commands on the titlebar,
 * Copy on status items. Dev builds keep the webview's own menu (Inspect) on Shift+right-click.
 */
export function AppContextMenu({ children }: { readonly children: ReactNode }) {
  const api = useExplorer();
  const platform = usePlatform();
  const { minimize, toggleMaximize, close } = useWindowControls();
  const openLink = (href: string) => {
    commands
      .openExternal(href)
      .catch((error: unknown) => api.report('Couldn’t open the link', error));
  };

  return (
    <WindowContextMenu
      allowNativeMenu={import.meta.env.DEV}
      onMinimize={() => void minimize()}
      onToggleMaximize={() => void toggleMaximize()}
      onClose={() => void close()}
      onOpenLink={openLink}
      onError={(error) => api.report('Clipboard unavailable', error)}
      items={(target) => {
        if (target.kind !== 'titlebar') return explorerMenuItems(target, api, platform);
        return (
          <>
            {(['new-tab', 'palette', 'settings'] as const).map((id) => {
              const entry = command(id);
              return (
                <ContextMenuItem
                  key={id}
                  icon={entry.icon}
                  shortcut={entry.shortcut}
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
