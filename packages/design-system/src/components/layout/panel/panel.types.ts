import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface PanelProps extends ComponentPropsWithRef<'section'> {
  /** Surface. @default 'panel' */
  surface?: 'panel' | 'sidebar' | 'sunken' | 'transparent' | undefined;
}

export interface PanelHeaderProps extends Omit<ComponentPropsWithRef<'header'>, 'title'> {
  /** Small uppercase title (VS Code view header). */
  title?: ReactNode | undefined;
  /** Trailing icon buttons; revealed on hover unless `actionsVisible`. */
  actions?: ReactNode | undefined;
  /** Always show the actions (default: on hover / focus-within, like VS Code). */
  actionsVisible?: boolean | undefined;
}

export type PanelBodyProps = ComponentPropsWithRef<'div'>;
export type PanelFooterProps = ComponentPropsWithRef<'footer'>;
