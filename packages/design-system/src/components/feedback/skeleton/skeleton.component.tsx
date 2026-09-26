import { cn } from '../../../utils/cn.util';
import type { SkeletonProps } from './skeleton.types';
import { skeletonVariants } from './skeleton.variants';

/** A placeholder block for loading content. Decorative: announce loading elsewhere (e.g. `aria-busy`). */
export function Skeleton({ shape = 'rect', animated = true, className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(skeletonVariants({ shape, animated }), className)}
      {...props}
    />
  );
}
