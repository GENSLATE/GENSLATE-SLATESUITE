import { tv } from '../../../utils/cn.util';

export const textareaVariants = tv({
  base: [
    'scrollbar-thin block w-full outline-none placeholder:text-fg-muted',
    'data-disabled:cursor-not-allowed',
  ],
  variants: {
    size: {
      sm: 'px-2 py-1',
      md: 'px-2.5 py-1.5',
      lg: 'px-3 py-2',
    },
    autoGrow: {
      true: 'resize-none overflow-y-auto',
      false: 'resize-y',
    },
  },
  defaultVariants: { size: 'md', autoGrow: false },
});
