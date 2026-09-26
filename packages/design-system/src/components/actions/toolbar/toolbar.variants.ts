import { tv } from '../../../utils/cn.util';

export const toolbarVariants = tv({
  slots: {
    root: 'flex min-w-0 items-center gap-0.5 data-[orientation=vertical]:flex-col',
    group: 'flex items-center gap-0.5 data-[orientation=vertical]:flex-col',
    separator: [
      'mx-1 shrink-0 bg-border',
      'data-[orientation=vertical]:h-4 data-[orientation=vertical]:w-px',
      'data-[orientation=horizontal]:my-1 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-4',
    ],
    spacer: 'flex-1',
  },
  variants: {
    variant: {
      bar: { root: 'hairline-b h-toolbar shrink-0 bg-surface px-2' },
      inline: {},
    },
  },
  defaultVariants: { variant: 'inline' },
});
