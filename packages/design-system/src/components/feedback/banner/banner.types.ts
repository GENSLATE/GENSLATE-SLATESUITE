import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { IconSlot } from '../../display/icon/icon.slot';

export type BannerTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface BannerProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** @default 'info' */
  tone?: BannerTone | undefined;
  /** Bold first line. */
  title?: ReactNode | undefined;
  /** Overrides the tone's icon; `null` hides it. */
  icon?: IconSlot | null | undefined;
  /** Trailing actions (small buttons). */
  actions?: ReactNode | undefined;
  /** Shows a close button. */
  onDismiss?: (() => void) | undefined;
  /**
   * `inline` (default): a rounded callout inside content.
   * `bar`: full-width strip with a bottom hairline (under a toolbar or titlebar).
   */
  variant?: 'inline' | 'bar' | undefined;
  labels?: { dismiss?: string } | undefined;
}
