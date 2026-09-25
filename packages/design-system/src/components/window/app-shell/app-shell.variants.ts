import { tv } from '../../../utils/cn.util';

export const appShellVariants = tv({
  slots: {
    root: 'flex h-full w-full flex-col overflow-hidden bg-canvas text-fg data-resizing:cursor-col-resize data-resizing:select-none',
    body: 'relative flex min-h-0 flex-1',
    sidebar:
      'relative flex min-h-0 shrink-0 flex-col border-border-subtle border-r data-collapsed:hidden',
    main: 'relative flex min-h-0 min-w-0 flex-1 flex-col bg-canvas',
    inspector: 'flex min-h-0 shrink-0 flex-col border-border-subtle border-l',
    sash: [
      'group/sash absolute inset-y-0 -right-0.75 z-sash w-1.5 cursor-col-resize touch-none outline-none',
    ],
    sashLine: [
      'pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-accent opacity-0',
      'transition-opacity duration-fast ease-standard',
      'group-hover/sash:opacity-100 group-hover/sash:delay-300',
      'group-focus-visible/sash:opacity-100 group-data-dragging/sash:opacity-100 group-data-dragging/sash:delay-0',
    ],
  },
});
