import { ContextMenuItem, useToast, WindowContextMenu } from '@genslate/design-system';
import { commands, useWindowControls } from '@genslate/tauri-bridge';
import type { ReactNode } from 'react';

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

interface AppContextMenuProps {
  readonly sidebarCollapsed: boolean;
  readonly onToggleSidebar: () => void;
  readonly inspectorOpen: boolean;
  readonly onToggleInspector: () => void;
  readonly onOpenCommandPalette: () => void;
  readonly children: ReactNode;
}

/**
 * The Design Kit's right-click menus: the shared window menu plus the kit's own layout toggles
 * on the titlebar and status bar.
 */
export function AppContextMenu({
  sidebarCollapsed,
  onToggleSidebar,
  inspectorOpen,
  onToggleInspector,
  onOpenCommandPalette,
  children,
}: AppContextMenuProps) {
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
      items={(target) =>
        target.kind === 'titlebar' || target.kind === 'statusbar' ? (
          <>
            <ContextMenuItem icon="codicon:search" shortcut="mod+k" onClick={onOpenCommandPalette}>
              Search Components…
            </ContextMenuItem>
            <ContextMenuItem
              icon={
                sidebarCollapsed ? 'codicon:layout-sidebar-left-off' : 'codicon:layout-sidebar-left'
              }
              shortcut="mod+b"
              onClick={onToggleSidebar}
            >
              {sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
            </ContextMenuItem>
            <ContextMenuItem icon="codicon:settings-gear" onClick={onToggleInspector}>
              {inspectorOpen ? 'Close Appearance Inspector' : 'Open Appearance Inspector'}
            </ContextMenuItem>
          </>
        ) : null
      }
    >
      {children}
    </WindowContextMenu>
  );
}
