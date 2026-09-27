import { useToast, WindowContextMenu } from '@genslate/design-system';
import { commands, useWindowControls } from '@genslate/tauri-bridge';
import type { ReactNode } from 'react';

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Right-click menus for the whole window: window commands and Theme on the titlebar, Edit
 * commands in text boxes, Copy / Select All and links in the content, Copy on status items.
 * Dev builds keep the webview's own menu (Inspect) on Shift+right-click.
 */
export function AppContextMenu({ children }: { readonly children: ReactNode }) {
  const { minimize, toggleMaximize, close } = useWindowControls();
  const toast = useToast();
  const report = (error: unknown) =>
    toast.add({ title: 'Clipboard unavailable', description: messageOf(error), type: 'error' });
  const openLink = (href: string) => {
    commands.openExternal(href).catch(report);
  };

  return (
    <WindowContextMenu
      allowNativeMenu={import.meta.env.DEV}
      onMinimize={() => void minimize()}
      onToggleMaximize={() => void toggleMaximize()}
      onClose={() => void close()}
      onOpenLink={openLink}
      onError={report}
    >
      {children}
    </WindowContextMenu>
  );
}
