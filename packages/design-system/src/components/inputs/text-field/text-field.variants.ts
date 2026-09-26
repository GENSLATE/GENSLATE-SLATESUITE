import { tv } from '../../../utils/cn.util';

/** Leading / trailing adornments inside the field chrome. */
export const textFieldAdornmentVariants = tv({
  base: 'flex shrink-0 items-center text-fg-muted group-data-disabled/field:text-fg-disabled',
});

/** The small inline clear (×) button. */
export const textFieldClearVariants = tv({
  base: [
    'focus-ring -mr-1 flex size-5 shrink-0 items-center justify-center rounded-sm text-fg-muted',
    'transition-colors duration-fast ease-standard hover:bg-fill-hover hover:text-fg active:bg-fill-pressed',
  ],
});
