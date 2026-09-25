import { tv } from '../../../utils/cn.util';

/** 24px VS Code status bar, in quiet chrome colours. */
export const statusBarVariants = tv({
  slots: {
    root: [
      'relative z-chrome flex h-statusbar shrink-0 items-stretch justify-between gap-2 overflow-hidden',
      'chrome bg-statusbar-bg text-statusbar-fg text-xs shadow-[inset_0_1px_0_0_var(--gs-statusbar-border)]',
      'window-inactive:text-titlebar-fg-inactive',
    ],
    section: 'flex min-w-0 items-stretch',
    item: [
      'inline-flex h-full max-w-80 shrink-0 items-center gap-1 whitespace-nowrap px-2 tabular-nums',
      'transition-colors duration-fast ease-standard',
    ],
    label: 'truncate-flex',
  },
  variants: {
    align: {
      start: { section: 'justify-start' },
      end: { section: 'justify-end pr-1' },
    },
    interactive: {
      true: {
        item: 'focus-ring-inset cursor-default hover:bg-statusbar-bg-hover active:bg-statusbar-bg-active',
      },
    },
    accent: {
      true: {
        item: [
          'bg-statusbar-accent-bg px-2.5 text-statusbar-accent-fg',
          'window-inactive:bg-statusbar-bg-active window-inactive:text-statusbar-fg',
        ],
      },
    },
  },
  compoundVariants: [
    {
      accent: true,
      interactive: true,
      class: { item: 'hover:bg-statusbar-accent-bg-hover active:bg-statusbar-accent-bg-hover' },
    },
  ],
});
