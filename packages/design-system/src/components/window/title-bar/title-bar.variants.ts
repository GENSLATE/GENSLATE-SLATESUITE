import { tv } from '../../../utils/cn.util';

/** 38px unified titlebar: quiet chrome, a hairline below, dims when the window is in the background. */
export const titleBarVariants = tv({
  slots: {
    root: [
      'relative z-chrome grid h-titlebar shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center',
      'chrome bg-titlebar-bg text-titlebar-fg shadow-[inset_0_-1px_0_0_var(--gs-titlebar-border)]',
      'transition-colors duration-fast ease-standard',
      'data-inactive:bg-titlebar-bg-inactive data-inactive:text-titlebar-fg-inactive',
    ],
    start: 'flex h-full min-w-0 items-center gap-1 justify-self-stretch',
    lights: 'flex h-full items-center px-traffic-inset-x',
    spacer: 'h-full w-traffic-spacer shrink-0',
    center: 'flex h-full min-w-0 items-center justify-center px-2',
    title: 'truncate-flex font-medium text-sm',
    end: 'flex h-full min-w-0 items-center justify-end gap-0.5 justify-self-stretch',
    actions: 'flex items-center gap-0.5 pr-2',
  },
  variants: {
    controls: {
      'traffic-lights': { start: 'pr-1' },
      windows: { start: 'pl-2', actions: 'pr-1' },
      none: { start: 'pl-2' },
    },
  },
});

export const commandCenterVariants = tv({
  slots: {
    root: [
      'group/cc relative flex h-6 w-[clamp(12rem,38vw,var(--gs-size-command-center-max))] min-w-0 items-center justify-center gap-1.5 px-7',
      'rounded-control border border-command-center-border bg-command-center-bg text-sm text-titlebar-fg',
      'focus-ring transition-colors duration-fast ease-standard',
      'hover:bg-command-center-bg-hover active:bg-command-center-bg-hover',
      'window-inactive:border-transparent window-inactive:text-titlebar-fg-inactive',
    ],
    icon: 'shrink-0 opacity-80',
    label: 'truncate-flex',
    hint: 'pointer-events-none absolute right-1.5 opacity-80 transition-opacity duration-fast group-hover/cc:opacity-100',
  },
});
