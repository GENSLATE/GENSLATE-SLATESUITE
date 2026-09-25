import { tv } from '../../../utils/cn.util';

export const switchLabelVariants = tv({
  base: 'group/switch inline-flex select-none items-center gap-3 text-base text-fg has-data-disabled:text-fg-disabled',
  variants: {
    labelPosition: {
      start: 'w-full justify-between',
      end: 'w-fit flex-row-reverse justify-end gap-2',
    },
  },
  defaultVariants: { labelPosition: 'start' },
});

/** The track: neutral when off, accent when on. */
export const switchTrackVariants = tv({
  base: [
    'focus-ring relative inline-flex shrink-0 items-center rounded-full p-0.5 outline-none',
    'bg-track shadow-inset transition-[background-color] duration-base ease-standard',
    'hover:bg-control-pressed',
    'data-checked:bg-accent data-checked:shadow-none data-checked:hover:bg-accent-hover',
    'data-disabled:pointer-events-none data-disabled:opacity-40',
    'window-inactive:data-checked:bg-fg-disabled',
  ],
  variants: {
    size: {
      sm: 'h-3.5 w-6',
      md: 'h-4 w-7',
    },
  },
  defaultVariants: { size: 'md' },
});

/** The round thumb, sliding with the spring curve (transform only). */
export const switchThumbVariants = tv({
  base: [
    'block rounded-full bg-thumb shadow-control will-change-transform',
    'transition-transform duration-moderate ease-spring',
  ],
  variants: {
    size: {
      sm: 'size-2.5 data-checked:translate-x-2.5',
      md: 'size-3 data-checked:translate-x-3',
    },
  },
  defaultVariants: { size: 'md' },
});

export const switchTextVariants = tv({
  base: 'flex min-w-0 flex-col gap-0.5',
});

export const switchDescriptionVariants = tv({
  base: 'text-fg-muted text-sm group-has-data-disabled/switch:text-fg-disabled',
});
