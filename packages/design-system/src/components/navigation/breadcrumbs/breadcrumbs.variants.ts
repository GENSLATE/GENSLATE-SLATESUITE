import { tv } from '../../../utils/cn.util';

export const breadcrumbsVariants = tv({
  slots: {
    root: 'min-w-0 select-none',
    list: 'm-0 flex min-w-0 list-none items-center p-0',
    item: 'flex min-w-0 items-center',
    link: [
      'focus-ring flex min-w-0 items-center gap-1 rounded-xs px-1 text-fg-muted no-underline',
      'transition-colors duration-fast ease-standard hover:bg-fill-hover hover:text-fg hover:no-underline active:bg-fill-pressed',
    ],
    current: 'flex min-w-0 items-center gap-1 px-1 text-fg',
    text: 'truncate-flex',
    separator: 'flex shrink-0 items-center text-fg-disabled',
  },
  variants: {
    size: {
      sm: { list: 'h-5 text-sm', link: 'h-5', current: 'h-5' },
      md: { list: 'h-6 text-base', link: 'h-6', current: 'h-6' },
    },
  },
  defaultVariants: { size: 'sm' },
});
