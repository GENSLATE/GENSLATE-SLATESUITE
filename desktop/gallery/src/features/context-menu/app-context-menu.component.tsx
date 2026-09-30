import {
  ContextMenuItem,
  ContextMenuSeparator,
  usePlatform,
  WindowContextMenu,
} from '@genslate/design-system';
import { commands, useWindowControls } from '@genslate/tauri-bridge';
import type { ReactNode } from 'react';

import { command } from '../../app/commands.registry';
import { useGallery } from '../../app/gallery.context';
import { galleryMenuItems } from './gallery-menu-items.component';

/**
 * Right-click menus for the whole window: photo commands on photos and in the viewer, view
 * and library commands on the background, album and folder commands in the side panel, Edit
 * commands in text boxes, Theme and window commands on the titlebar, Copy on status items.
 * Dev builds keep the webview's own menu (Inspect) on Shift+right-click.
 */
export function AppContextMenu({ children }: { readonly children: ReactNode }) {
  const api = useGallery();
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
        if (target.kind !== 'titlebar') return galleryMenuItems(target, api, platform);
        return (
          <>
            {(['add-folder', 'palette', 'settings'] as const).map((id) => {
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
