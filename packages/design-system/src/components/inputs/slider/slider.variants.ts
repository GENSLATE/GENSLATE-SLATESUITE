import { tv } from '../../../utils/cn.util';

export const sliderVariants = tv({
  slots: {
    root: 'flex w-full min-w-0 flex-col gap-1.5 data-disabled:opacity-50',
    header: 'flex items-center justify-between gap-2',
    label: 'select-none font-medium text-fg-secondary text-sm',
    value: 'text-fg-muted text-sm tabular-nums',
    control:
      'relative flex h-5 w-full touch-none select-none items-center data-disabled:pointer-events-none',
    track: 'relative h-1 w-full rounded-full bg-track shadow-inset',
    indicator: 'rounded-full bg-accent window-inactive:bg-fg-disabled',
    thumb: [
      'size-4 rounded-full bg-thumb shadow-control outline-2 outline-transparent outline-offset-2',
      'ring-[0.5px] ring-border-strong',
      'transition-[scale] duration-fast ease-spring active:scale-110 data-dragging:scale-110',
      'has-focus-visible:outline-focus',
    ],
    ticks: 'pointer-events-none absolute inset-x-2 top-full mt-0.5 h-1',
    tick: 'absolute top-0 h-1 w-px -translate-x-1/2 bg-border-strong',
  },
});
