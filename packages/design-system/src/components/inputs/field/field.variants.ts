import { tv } from '../../../utils/cn.util';

/** Vertical stack: label, control, then description or error. */
export const fieldRootVariants = tv({
  base: 'flex min-w-0 flex-col gap-1.5',
});

export const fieldLabelVariants = tv({
  base: [
    'w-fit select-none font-medium text-fg-secondary text-sm',
    'data-disabled:text-fg-disabled',
  ],
});

export const fieldDescriptionVariants = tv({
  base: 'text-fg-muted text-sm data-disabled:text-fg-disabled',
});

export const fieldErrorVariants = tv({
  base: [
    'flex items-start gap-1 text-danger-fg text-sm',
    'transition-opacity duration-fast ease-standard data-ending-style:opacity-0 data-starting-style:opacity-0',
  ],
});
