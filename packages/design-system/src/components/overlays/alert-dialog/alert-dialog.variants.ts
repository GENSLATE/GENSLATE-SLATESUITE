import { tv } from '../../../utils/cn.util';

export const alertDialogVariants = tv({
  slots: {
    layout: 'flex gap-4',
    icon: 'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
    content: 'flex min-w-0 flex-1 flex-col',
  },
  variants: {
    tone: {
      default: { icon: 'bg-accent-subtle text-accent-fg' },
      danger: { icon: 'bg-danger-subtle text-danger-fg' },
    },
  },
  defaultVariants: { tone: 'default' },
});
