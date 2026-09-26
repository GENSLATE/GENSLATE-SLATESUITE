import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface ColorSwatchProps extends Omit<ComponentPropsWithRef<'div'>, 'color'> {
  /** Any CSS colour, including `var(--gs-color-accent)`. */
  color: string;
  /** Token or colour name. */
  name?: ReactNode | undefined;
  /** Secondary text, e.g. the resolved hex or the utility class. */
  value?: ReactNode | undefined;
  /** `tile`: a square chip over its caption · `row`: a small chip beside the text. @default 'tile' */
  layout?: 'tile' | 'row' | undefined;
}
