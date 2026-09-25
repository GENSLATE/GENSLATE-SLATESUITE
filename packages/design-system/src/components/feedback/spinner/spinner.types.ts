import type { ComponentPropsWithRef } from 'react';

export type SpinnerSize = 12 | 14 | 16 | 20 | 32;

export interface SpinnerProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** @default 16 */
  size?: SpinnerSize | undefined;
  /** Accessible name. Ignored when `decorative`. @default 'Loading' */
  label?: string | undefined;
  /** Hide from assistive tech (e.g. inside a button that already sets `aria-busy`). */
  decorative?: boolean | undefined;
}
