import { tv } from '../../../utils/cn.util';

export const menuVariants = tv({
  slots: {
    positioner: 'z-popover outline-none',
    popup: 'scrollbar-none max-h-(--available-height) overflow-y-auto overscroll-contain',
    icon: 'text-fg-muted group-data-disabled/item:text-fg-disabled group-data-highlighted/item:text-on-accent',
    media:
      'flex size-4 shrink-0 items-center justify-center overflow-hidden *:size-full group-data-disabled/item:opacity-50',
    label: 'truncate-flex flex-1',
    indicator: 'absolute left-1.5 flex size-4 items-center justify-center',
    radioDot: 'size-1.5 rounded-full bg-current',
    groupLabel: 'flex h-6 select-none items-center px-2 font-semibold text-fg-muted text-xs',
    separator: 'mx-2 my-1 h-px bg-border-subtle',
    submenuTrigger: 'data-popup-open:not-data-highlighted:bg-fill-pressed',
    chevron: '-mr-0.5 ml-auto text-fg-muted group-data-highlighted/item:text-on-accent',
    header: 'flex select-none items-center gap-2.5 px-2 pt-1.5 pb-2',
    headerMedia: 'flex size-8 shrink-0 items-center justify-center overflow-hidden *:size-full',
    headerText: 'flex min-w-0 flex-1 flex-col',
    headerTitle: 'truncate font-semibold text-base text-fg leading-tight',
    headerDescription: 'truncate text-fg-muted text-xs leading-tight',
    headerAccessory: 'ml-auto flex shrink-0 items-center',
  },
});
