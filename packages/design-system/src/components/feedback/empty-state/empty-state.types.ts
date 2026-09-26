import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { IconSlot } from '../../display/icon/icon.slot';

export interface EmptyStateProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** A large, quiet glyph (codicon ref or element). */
  icon?: IconSlot | undefined;
  title: ReactNode;
  description?: ReactNode | undefined;
  /** Buttons / links under the text. */
  actions?: ReactNode | undefined;
  /** `sm` for panels and sidebars, `md` for pages. @default 'md' */
  size?: 'sm' | 'md' | undefined;
}
