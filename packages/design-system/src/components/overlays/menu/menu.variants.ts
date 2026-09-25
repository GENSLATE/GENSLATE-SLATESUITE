import { tv } from '../../../utils/cn.util';

export const menuVariants = tv({
  slots: {
    positioner: 'z-popover outline-none',
    popup: 'scrollbar-none max-h-(--available-height) overflow-y-auto overscroll-contain',
    icon: 'text-fg-muted group-data-disabled/item:text-fg-disabled group-data-highlighted/item:text-on-accent',
    label: 'truncate-flex flex-1',
    indicator: 'absolute left-1.5 flex size-4 items-center justify-center',
    radioDot: 'size-1.5 rounded-full bg-current',
    groupLabel: 'flex h-6 select-none items-center px-2 font-semibold text-fg-muted text-xs',
    separator: 'mx-2 my-1 h-px bg-border-subtle',
    submenuTrigger: 'data-popup-open:not-data-highlighted:bg-fill-pressed',
    chevron: '-mr-0.5 ml-auto text-fg-muted group-data-highlighted/item:text-on-accent',
  },
});
