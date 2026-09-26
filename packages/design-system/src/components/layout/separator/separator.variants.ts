import { tv } from '../../../utils/cn.util';

export const separatorVariants = tv({
  base: 'shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch',
  variants: {
    tone: {
      subtle: 'bg-border-subtle',
      default: 'bg-border',
    },
  },
  defaultVariants: { tone: 'subtle' },
});
