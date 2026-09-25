import { tv } from '../../../utils/cn.util';

export const skeletonVariants = tv({
  base: ['relative block shrink-0 overflow-hidden bg-fill-pressed'],
  variants: {
    shape: {
      text: 'my-1 h-2.5 w-full rounded-full',
      rect: 'rounded-control',
      circle: 'rounded-full',
    },
    animated: {
      true: [
        'after:absolute after:inset-0 after:animate-shimmer after:content-[""] motion-reduce:after:hidden',
        'after:bg-[linear-gradient(90deg,transparent,var(--gs-color-fill-hover),transparent)]',
      ],
    },
  },
  defaultVariants: { shape: 'rect', animated: true },
});
