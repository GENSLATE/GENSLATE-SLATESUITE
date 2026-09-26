import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface CardProps extends ComponentPropsWithRef<'div'> {
  /**
   * `outline`: flat surface + hairline (default, resting content) ·
   * `raised`: card shadow (draggable / floating-ish) · `sunken`: recessed well.
   */
  variant?: 'outline' | 'raised' | 'sunken' | undefined;
  /** Inner padding. @default 'md' */
  padding?: 'none' | 'sm' | 'md' | 'lg' | undefined;
  /** Hover/press affordance for clickable cards. */
  interactive?: boolean | undefined;
}

export interface CardHeaderProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  title?: ReactNode | undefined;
  description?: ReactNode | undefined;
  /** Trailing actions. */
  actions?: ReactNode | undefined;
}

export type CardBodyProps = ComponentPropsWithRef<'div'>;
export type CardFooterProps = ComponentPropsWithRef<'div'>;
