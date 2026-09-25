import { tv } from '../../../utils/cn.util';

export const emptyStateVariants = tv({
  slots: {
    root: 'flex flex-col items-center justify-center text-center',
    icon: 'flex items-center justify-center rounded-full bg-fill-hover text-fg-muted',
    title: 'font-semibold text-fg-strong',
    description: 'max-w-80 text-fg-muted',
    actions: 'flex flex-wrap items-center justify-center gap-2',
  },
  variants: {
    size: {
      sm: {
        root: 'gap-2 p-4',
        icon: 'size-9',
        title: 'text-base',
        description: 'text-sm',
        actions: 'mt-1',
      },
      md: {
        root: 'gap-3 p-8',
        icon: 'mb-1 size-12',
        title: 'text-md',
        description: 'text-base',
        actions: 'mt-2',
      },
    },
  },
  defaultVariants: { size: 'md' },
});
