import { tv } from '../../../utils/cn.util';

/** Label row wrapping the box and its text. */
export const checkboxLabelVariants = tv({
  base: [
    'group/checkbox inline-flex w-fit select-none items-start gap-2 text-base text-fg',
    'has-data-disabled:text-fg-disabled',
  ],
});

/** The 14px box: flat field at rest, accent fill when checked or mixed. */
export const checkboxBoxVariants = tv({
  base: [
    'focus-ring relative inline-flex size-3.5 shrink-0 items-center justify-center rounded-xs',
    'border border-border-strong bg-field text-on-accent shadow-inset',
    'transition-[background-color,border-color,box-shadow] duration-fast ease-standard',
    'hover:border-fg-muted',
    'data-checked:border-accent data-checked:bg-accent data-checked:shadow-none data-checked:hover:border-accent-hover data-checked:hover:bg-accent-hover',
    'data-indeterminate:border-accent data-indeterminate:bg-accent data-indeterminate:shadow-none',
    'active:data-checked:bg-accent-active active:data-indeterminate:bg-accent-active',
    'data-invalid:border-danger-border',
    'data-disabled:pointer-events-none data-disabled:opacity-40',
    'window-inactive:data-checked:border-border-strong window-inactive:data-checked:bg-fg-disabled',
  ],
  variants: {
    withLabel: { true: 'mt-0.5' },
  },
});

/** The check / dash glyph, springing in on check. */
export const checkboxIndicatorVariants = tv({
  base: [
    'flex items-center justify-center',
    'transition-[scale,opacity] duration-base ease-spring',
    'data-starting-style:scale-50 data-starting-style:opacity-0',
    'data-ending-style:scale-75 data-ending-style:opacity-0 data-ending-style:duration-fast data-ending-style:ease-exit',
  ],
});

export const checkboxTextVariants = tv({
  base: 'flex min-w-0 flex-col gap-0.5',
});

export const checkboxDescriptionVariants = tv({
  base: 'text-fg-muted text-sm group-has-data-disabled/checkbox:text-fg-disabled',
});
