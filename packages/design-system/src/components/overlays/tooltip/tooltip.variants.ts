import { tv } from '../../../utils/cn.util';

export const tooltipVariants = tv({
  slots: {
    positioner: 'z-tooltip',
    popup: [
      'flex max-w-80 origin-(--transform-origin) items-center gap-2 rounded-sm border border-tooltip-border px-2 py-1',
      'select-none bg-tooltip-bg text-sm text-tooltip-fg shadow-popover',
      'transition-[opacity,scale] duration-fast ease-enter',
      'data-starting-style:scale-96 data-starting-style:opacity-0',
      'data-ending-style:opacity-0 data-ending-style:ease-exit',
      'data-instant:transition-none',
    ],
    shortcut: 'font-sans tabular-nums tracking-wide opacity-65',
  },
});
