import { tv } from '../../../utils/cn.util';

export const panelVariants = tv({
  slots: {
    root: 'group/panel flex min-h-0 min-w-0 flex-col text-fg',
    header: 'chrome flex h-panel-header shrink-0 items-center gap-2 pr-1.5 pl-3',
    title: 'truncate-flex flex-1 font-semibold text-2xs text-fg-muted uppercase tracking-wider',
    actions: 'flex shrink-0 items-center gap-0.5 transition-opacity duration-fast ease-standard',
    body: 'min-h-0 flex-1',
    footer: 'hairline-t flex h-panel-header shrink-0 items-center gap-2 px-3 text-fg-muted text-sm',
  },
  variants: {
    surface: {
      panel: { root: 'bg-surface-panel' },
      sidebar: { root: 'bg-surface-sidebar' },
      sunken: { root: 'bg-surface-sunken' },
      transparent: {},
    },
    actionsVisible: {
      false: {
        actions: 'opacity-0 group-focus-within/panel:opacity-100 group-hover/panel:opacity-100',
      },
    },
  },
  defaultVariants: { surface: 'panel', actionsVisible: false },
});
