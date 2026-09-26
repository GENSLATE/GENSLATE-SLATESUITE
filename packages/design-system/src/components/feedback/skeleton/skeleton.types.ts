import type { ComponentPropsWithRef } from 'react';

export interface SkeletonProps extends ComponentPropsWithRef<'div'> {
  /** `text`: a 10px bar on a text line · `rect` · `circle`. @default 'rect' */
  shape?: 'text' | 'rect' | 'circle' | undefined;
  /** Shimmer sweep (disabled under reduced motion). @default true */
  animated?: boolean | undefined;
}
