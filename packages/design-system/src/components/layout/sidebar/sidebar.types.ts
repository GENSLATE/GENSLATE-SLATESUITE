import type { useRender } from '@base-ui/react/use-render';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { IconSlot } from '../../display/icon/icon.slot';
import type { ScrollAreaProps } from '../scroll-area/scroll-area.types';

export interface SidebarProps extends ComponentPropsWithRef<'nav'> {
  /** Accessible name of the navigation landmark. @default 'Sidebar' */
  'aria-label'?: string | undefined;
}

export interface SidebarHeaderProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  title?: ReactNode | undefined;
  actions?: ReactNode | undefined;
}

export type SidebarContentProps = ScrollAreaProps;
export type SidebarFooterProps = ComponentPropsWithRef<'div'>;

export interface SidebarSectionProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** Small uppercase section title. Omit for an untitled group. */
  title?: ReactNode | undefined;
  /** The title toggles the section. @default true when titled */
  collapsible?: boolean | undefined;
  open?: boolean | undefined;
  /** @default true */
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Trailing section actions (shown on hover). */
  actions?: ReactNode | undefined;
}

export interface SidebarItemProps extends Omit<useRender.ComponentProps<'button'>, 'children'> {
  /** Leading 16px icon (codicon ref or element). */
  icon?: IconSlot | undefined;
  children?: ReactNode | undefined;
  /** Current page / selection: pill highlight + `aria-current`. */
  selected?: boolean | undefined;
  /** Trailing count (tabular, muted). */
  count?: number | undefined;
  /** Trailing badge or any element (replaces `count`). */
  badge?: ReactNode | undefined;
  /** Nesting level for indented items. @default 0 */
  depth?: number | undefined;
  disabled?: boolean | undefined;
  /** Renders an `<a>` instead of a `<button>`. */
  href?: string | undefined;
  /** `aria-current` value when selected. @default 'page' */
  current?: 'page' | 'location' | 'true' | undefined;
}
