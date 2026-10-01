import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { IconSlot } from '../../display/icon/icon.slot';

/** Visible strings of {@link FeatureTeaserProps}, with English defaults. */
export interface FeatureTeaserLabels {
  /** The badge beside the title. @default 'Coming soon' */
  soon?: string | undefined;
}

export interface FeatureTeaserProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** The feature's glyph (codicon ref or element). */
  icon: IconSlot;
  /** The feature's name, rendered as a heading. */
  title: ReactNode;
  /** One or two sentences on what the feature will do. */
  children: ReactNode;
  /** Heading level of the title. @default 2 */
  level?: 2 | 3 | undefined;
  labels?: FeatureTeaserLabels | undefined;
}

export interface FeatureTeaserSampleProps extends ComponentPropsWithRef<'div'> {
  /** Small uppercase caption above the sample, e.g. "Example". */
  label: ReactNode;
}
