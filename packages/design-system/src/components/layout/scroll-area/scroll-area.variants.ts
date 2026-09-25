import { tv } from '../../../utils/cn.util';

/** VS Code overlay scrollbars: invisible at rest, a 10px lane with a slim thumb on hover or scroll. */
export const scrollAreaVariants = tv({
  slots: {
    root: 'relative flex min-h-0 min-w-0 flex-col overflow-hidden',
    viewport: 'focus-ring-inset size-full min-h-0 flex-1 overscroll-contain rounded-[inherit]',
    scrollbar: [
      'z-raised flex touch-none select-none p-0.5',
      'opacity-0 transition-opacity delay-300 duration-slow ease-standard',
      'data-hovering:opacity-100 data-hovering:delay-0 data-hovering:duration-fast',
      'data-scrolling:opacity-100 data-scrolling:delay-0 data-scrolling:duration-fast',
      'data-[orientation=horizontal]:h-2.5 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col',
    ],
    thumb: [
      'flex-1 rounded-full bg-scrollbar-thumb transition-colors duration-fast ease-standard',
      'hover:bg-scrollbar-thumb-hover active:bg-scrollbar-thumb-active',
    ],
    shadow: [
      'pointer-events-none absolute inset-x-0 top-0 z-raised h-1.5 opacity-0 transition-opacity duration-fast ease-standard',
      'shadow-[inset_0_6px_6px_-6px_var(--gs-color-scrim)] group-data-overflow-y-start/scroll:opacity-100',
    ],
    corner: 'bg-transparent',
  },
});
