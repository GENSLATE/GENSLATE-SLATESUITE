import { tv } from '../../../utils/cn.util';

export const radioLabelVariants = tv({
  base: 'group/radio inline-flex w-fit select-none items-start gap-2 text-base text-fg has-data-disabled:text-fg-disabled',
});

/** 14px circle; accent fill with a centred dot when checked. */
export const radioVariants = tv({
  base: [
    'focus-ring relative inline-flex size-3.5 shrink-0 items-center justify-center rounded-full',
    'border border-border-strong bg-field shadow-inset',
    'transition-[background-color,border-color] duration-fast ease-standard',
    'hover:border-fg-muted',
    'data-checked:border-accent data-checked:bg-accent data-checked:shadow-none data-checked:hover:border-accent-hover data-checked:hover:bg-accent-hover',
    'active:data-checked:bg-accent-active',
    'data-invalid:border-danger-border',
    'data-disabled:pointer-events-none data-disabled:opacity-40',
    'window-inactive:data-checked:border-border-strong window-inactive:data-checked:bg-fg-disabled',
  ],
  variants: {
    withLabel: { true: 'mt-0.5' },
  },
});

export const radioIndicatorVariants = tv({
  base: [
    'block size-1.5 rounded-full bg-on-accent',
    'transition-[scale,opacity] duration-base ease-spring',
    'data-starting-style:scale-0 data-starting-style:opacity-0',
    'data-ending-style:scale-0 data-ending-style:opacity-0 data-ending-style:duration-fast data-ending-style:ease-exit',
  ],
});

export const radioTextVariants = tv({ base: 'flex min-w-0 flex-col gap-0.5' });

export const radioDescriptionVariants = tv({
  base: 'text-fg-muted text-sm group-has-data-disabled/radio:text-fg-disabled',
});
