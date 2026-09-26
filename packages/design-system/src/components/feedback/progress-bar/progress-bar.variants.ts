import { tv } from '../../../utils/cn.util';

export const progressBarVariants = tv({
  slots: {
    root: 'flex w-full flex-col gap-1.5',
    header: 'flex items-baseline justify-between gap-3 text-sm',
    label: 'truncate-flex text-fg-secondary',
    value: 'text-fg-muted tabular-nums',
    track: 'relative w-full overflow-hidden rounded-full bg-track',
    indicator: [
      'h-full rounded-full transition-[width] duration-moderate ease-standard motion-reduce:transition-none',
      'data-indeterminate:w-full data-indeterminate:origin-left data-indeterminate:animate-indeterminate',
      'window-inactive:bg-fg-muted',
    ],
  },
  variants: {
    size: {
      sm: { track: 'h-0.5' },
      md: { track: 'h-1' },
    },
    tone: {
      accent: { indicator: 'bg-accent' },
      success: { indicator: 'bg-success' },
      warning: { indicator: 'bg-warning' },
      danger: { indicator: 'bg-danger' },
    },
  },
  defaultVariants: { size: 'md', tone: 'accent' },
});
