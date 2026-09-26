import { tv } from '../../../utils/cn.util';

export const spinnerVariants = tv({
  slots: {
    root: 'inline-flex shrink-0 items-center justify-center text-current',
    svg: 'size-full animate-spin',
    track: 'opacity-20',
    arc: '',
  },
  variants: {
    size: {
      12: { root: 'size-3' },
      14: { root: 'size-3.5' },
      16: { root: 'size-4' },
      20: { root: 'size-5' },
      32: { root: 'size-8' },
    },
  },
  defaultVariants: { size: 16 },
});
