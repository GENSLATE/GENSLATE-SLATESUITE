import { tv } from '../../../utils/cn.util';

/** Shared by CheckboxGroup and RadioGroup. */
export const choiceGroupVariants = tv({
  slots: {
    root: 'flex min-w-0 flex-col gap-2',
    label: 'select-none font-medium text-fg-secondary text-sm',
    description: '-mt-1 text-fg-muted text-sm',
    items: 'flex',
  },
  variants: {
    orientation: {
      vertical: { items: 'flex-col gap-2' },
      horizontal: { items: 'flex-row flex-wrap gap-x-5 gap-y-2' },
    },
  },
  defaultVariants: { orientation: 'vertical' },
});
