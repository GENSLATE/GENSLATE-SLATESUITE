import type { ComponentPropsWithRef } from 'react';
import type { IconSlot } from '../../display/icon/icon.slot';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  /** @default 'neutral' */
  tone?: BadgeTone | undefined;
  /** `subtle`: tinted fill (default) · `solid`: full colour · `outline`: hairline only. */
  variant?: 'subtle' | 'solid' | 'outline' | undefined;
  /** `sm` 16px · `md` 20px. @default 'md' */
  size?: 'sm' | 'md' | undefined;
  /** Leading status dot. */
  dot?: boolean | undefined;
  /** Leading icon (12px). */
  icon?: IconSlot | undefined;
  /** Fully rounded — for counts. */
  pill?: boolean | undefined;
}
