import { tv } from '../../../utils/cn.util';

export const tabsVariants = tv({
  slots: {
    root: 'flex min-w-0 data-[orientation=vertical]:flex-row',
    list: 'relative z-base flex',
    tab: [
      'relative z-raised inline-flex shrink-0 cursor-default select-none items-center justify-center gap-1.5 whitespace-nowrap',
      'transition-colors duration-fast ease-standard',
      'data-disabled:pointer-events-none data-disabled:text-fg-disabled',
    ],
    indicator:
      'pointer-events-none absolute transition-[translate,width,height] duration-base ease-standard',
    panel: 'focus-ring-inset min-w-0 flex-1',
  },
  variants: {
    variant: {
      underline: {
        root: 'flex-col',
        list: [
          'hairline-b data-[orientation=vertical]:hairline-r items-stretch gap-0 data-[orientation=vertical]:flex-col data-[orientation=vertical]:shadow-none',
        ],
        tab: [
          'focus-ring-inset h-tabbar px-3 text-base text-fg-muted',
          'hover:text-fg data-active:text-fg-strong',
          'data-[orientation=vertical]:h-row-md data-[orientation=vertical]:justify-start',
        ],
        indicator: [
          'bottom-0 left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-tab-indicator',
          'data-[orientation=vertical]:top-0 data-[orientation=vertical]:right-0 data-[orientation=vertical]:bottom-auto data-[orientation=vertical]:left-auto',
          'data-[orientation=vertical]:h-(--active-tab-height) data-[orientation=vertical]:w-0.5 data-[orientation=vertical]:translate-x-0 data-[orientation=vertical]:translate-y-(--active-tab-top)',
          'window-inactive:bg-fg-disabled',
        ],
      },
      pill: {
        root: 'flex-col gap-3',
        list: 'inline-flex h-control-md w-fit items-stretch gap-0.5 rounded-control bg-fill-pressed p-0.5',
        tab: [
          'focus-ring rounded-[5px] px-3 text-base text-fg-secondary',
          'hover:text-fg-strong data-active:text-fg-strong',
        ],
        indicator: [
          'top-(--active-tab-top) left-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left)',
          'inset-ring inset-ring-border-subtle rounded-[5px] bg-control shadow-control',
        ],
      },
    },
  },
  defaultVariants: { variant: 'underline' },
});
