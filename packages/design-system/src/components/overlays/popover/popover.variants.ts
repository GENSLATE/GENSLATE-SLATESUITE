import { tv } from '../../../utils/cn.util';

export const popoverVariants = tv({
  slots: {
    positioner: 'z-popover',
    popup: 'min-w-48 max-w-(--available-width)',
    arrow: [
      'size-2.5 rotate-45 bg-surface-popover',
      'data-[side=bottom]:-top-[5px] data-[side=left]:-right-[5px] data-[side=top]:-bottom-[5px] data-[side=right]:-left-[5px]',
      'shadow-[-0.5px_-0.5px_0_0_var(--gs-color-border)] data-[side=top]:shadow-[0.5px_0.5px_0_0_var(--gs-color-border)]',
      'data-[side=left]:shadow-[0.5px_-0.5px_0_0_var(--gs-color-border)] data-[side=right]:shadow-[-0.5px_0.5px_0_0_var(--gs-color-border)]',
    ],
    title: 'font-semibold text-base text-fg-strong',
    description: 'mt-1 text-fg-secondary text-sm',
    close: [
      'focus-ring absolute top-2 right-2 flex size-5 items-center justify-center rounded-sm text-fg-muted outline-none',
      'transition-colors duration-fast ease-standard hover:bg-fill-hover hover:text-fg active:bg-fill-pressed',
    ],
  },
});
