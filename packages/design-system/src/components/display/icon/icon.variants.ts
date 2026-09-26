import { tv } from '../../../utils/cn.util';

export const iconVariants = tv({
  base: 'inline-flex shrink-0 items-center justify-center leading-none',
  variants: {
    size: {
      12: 'size-3 text-[12px]!',
      14: 'size-3.5 text-[14px]!',
      16: 'size-4 text-[16px]!',
      20: 'size-5 text-[20px]!',
    },
    spin: {
      true: 'animate-spin motion-reduce:animate-none',
    },
  },
  defaultVariants: { size: 16 },
});
