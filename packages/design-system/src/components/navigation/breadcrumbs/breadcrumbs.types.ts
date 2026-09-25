import type { ComponentProps, ReactNode } from 'react';
import type { CodiconRef } from '../../display/icon/icon.types';

export interface BreadcrumbItem {
  id: string;
  label: ReactNode;
  icon?: CodiconRef | undefined;
  /** Render as a link. */
  href?: string | undefined;
  /** Render as a button (ignored when `href` is set). */
  onSelect?: (() => void) | undefined;
}

export interface BreadcrumbsLabels {
  /** Accessible name of the navigation landmark. */
  nav?: string | undefined;
}

export interface BreadcrumbsProps extends Omit<ComponentProps<'nav'>, 'className' | 'children'> {
  /** Path segments, root first. The last one is the current location. */
  items: readonly BreadcrumbItem[];
  size?: 'sm' | 'md' | undefined;
  className?: string | undefined;
  labels?: BreadcrumbsLabels | undefined;
}
