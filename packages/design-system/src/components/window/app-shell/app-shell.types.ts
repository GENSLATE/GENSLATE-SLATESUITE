import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface AppShellProps extends ComponentPropsWithRef<'div'> {
  /** Top row, usually a `TitleBar`. */
  titleBar?: ReactNode | undefined;
  /** Bottom row, usually a `StatusBar`. */
  statusBar?: ReactNode | undefined;
  /** Left column, usually a `Sidebar`. Resizable via the sash on its trailing edge. */
  sidebar?: ReactNode | undefined;
  /** Optional right column (inspector). */
  inspector?: ReactNode | undefined;
  /** Inspector width in px. @default 280 */
  inspectorWidth?: number | undefined;
  /** Main content (rendered in a `main` landmark). */
  children?: ReactNode | undefined;
  /** Accessible name of the `main` landmark. */
  mainLabel?: string | undefined;

  sidebarWidth?: number | undefined;
  /** @default 248 (token `sidebar`) */
  defaultSidebarWidth?: number | undefined;
  onSidebarWidthChange?: ((width: number) => void) | undefined;
  /** @default 180 (token `sidebar-min`) */
  sidebarMinWidth?: number | undefined;
  /** @default 420 (token `sidebar-max`) */
  sidebarMaxWidth?: number | undefined;

  sidebarCollapsed?: boolean | undefined;
  defaultSidebarCollapsed?: boolean | undefined;
  onSidebarCollapsedChange?: ((collapsed: boolean) => void) | undefined;

  /** localStorage key to remember the (uncontrolled) sidebar width and collapsed state. */
  persistKey?: string | undefined;
  labels?: { sash?: string } | undefined;
}
