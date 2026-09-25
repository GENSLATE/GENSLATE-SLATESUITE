import type { ComponentType } from 'react';
import type { CodiconRef } from '@genslate/design-system';

/** Sidebar groups of the Design Kit showcase. */
export type ShowcaseCategory =
  | 'foundations'
  | 'window'
  | 'layout'
  | 'actions'
  | 'inputs'
  | 'navigation'
  | 'overlays'
  | 'feedback'
  | 'display';

/** One page of the showcase: a component (or foundation) with its state matrix. */
export interface ShowcaseSection {
  /** URL-safe id, unique across the showcase (e.g. `button`, `context-menu`). */
  readonly id: string;
  readonly title: string;
  /** One sentence shown under the page title. */
  readonly description: string;
  readonly category: ShowcaseCategory;
  readonly icon: CodiconRef;
  readonly component: ComponentType;
}
