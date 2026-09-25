import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { IconSlot } from '../../display/icon/icon.slot';

export interface StatusBarProps extends ComponentPropsWithRef<'footer'> {
  /** Accessible name of the landmark. @default 'Status bar' */
  'aria-label'?: string | undefined;
}

export interface StatusBarSectionProps extends ComponentPropsWithRef<'div'> {
  /** @default 'start' */
  align?: 'start' | 'end' | undefined;
}

export interface StatusBarItemProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** 14px leading icon. */
  icon?: IconSlot | undefined;
  children?: ReactNode | undefined;
  /** Tooltip (native `title`); also the accessible name of icon-only items. */
  label?: string | undefined;
  /**
   * The one accent item (VS Code's remote indicator). Sits flush at the start edge.
   */
  accent?: boolean | undefined;
  /** Renders a static `<span>` even without `onClick`. Items with `onClick` are buttons. */
  interactive?: boolean | undefined;
}
