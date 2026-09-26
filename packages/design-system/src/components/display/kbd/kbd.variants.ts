import { tv } from '../../../utils/cn.util';

export const kbdVariants = tv({
  slots: {
    root: 'inline-flex shrink-0 items-center whitespace-nowrap font-sans text-fg-muted',
    key: [
      'inline-flex items-center justify-center rounded-xs bg-control font-medium font-sans text-fg-secondary',
      'inset-ring inset-ring-border-subtle shadow-[inset_0_-1px_0_0_var(--gs-color-border)]',
    ],
    separator: 'text-fg-disabled',
  },
  variants: {
    variant: {
      keycap: { root: 'gap-0.5' },
      inline: { root: 'tabular-nums tracking-wide', key: '' },
    },
    size: {
      sm: { root: 'text-2xs', key: 'h-4 min-w-4 px-1 text-2xs' },
      md: { root: 'text-xs', key: 'h-5 min-w-5 px-1.5 text-xs' },
    },
  },
  defaultVariants: { variant: 'keycap', size: 'md' },
});
