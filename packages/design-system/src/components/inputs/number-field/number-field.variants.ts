import { tv } from '../../../utils/cn.util';

export const numberFieldGroupVariants = tv({
  base: 'group/field overflow-hidden pr-0',
});

export const numberFieldStepperVariants = tv({
  base: 'flex h-full w-5 shrink-0 flex-col self-stretch border-border-subtle border-l',
});

export const numberFieldStepVariants = tv({
  base: [
    'flex min-h-0 flex-1 items-center justify-center text-fg-muted outline-none',
    'transition-colors duration-fast ease-standard',
    'hover:bg-fill-hover hover:text-fg active:bg-fill-pressed',
    'data-disabled:pointer-events-none data-disabled:text-fg-disabled',
    '[&+&]:border-border-subtle [&+&]:border-t',
  ],
});
