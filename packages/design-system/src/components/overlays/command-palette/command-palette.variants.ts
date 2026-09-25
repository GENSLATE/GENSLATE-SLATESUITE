import { tv } from '../../../utils/cn.util';

export const commandPaletteVariants = tv({
  slots: {
    viewport: 'fixed inset-0 z-dialog flex items-start justify-center px-4 pt-[12vh]',
    popup: 'flex max-h-[min(70vh,32rem)] w-palette max-w-full origin-top flex-col overflow-hidden',
    search: 'hairline-b flex h-11 shrink-0 items-center gap-2.5 px-3.5 text-fg-muted',
    input:
      'h-full min-w-0 flex-1 bg-transparent text-fg-strong text-md outline-none placeholder:text-fg-muted',
    list: 'scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 outline-none',
    groupLabel: 'flex h-7 select-none items-end px-2 pb-1 font-semibold text-fg-muted text-xs',
    row: 'h-row-md gap-2.5 px-2.5',
    icon: 'text-fg-muted group-data-highlighted/item:text-on-accent',
    label: 'truncate-flex',
    match: 'bg-transparent font-semibold text-accent-fg group-data-highlighted/item:text-on-accent',
    detail:
      'truncate-flex min-w-0 flex-1 text-fg-muted text-sm group-data-highlighted/item:text-on-accent/80',
    empty: 'flex flex-col items-center justify-center gap-2 px-4 py-10 text-base text-fg-muted',
    footer:
      'hairline-t flex h-8 shrink-0 select-none items-center gap-4 px-3.5 text-fg-muted text-xs',
    key: 'mr-1 inline-flex min-w-4 items-center justify-center rounded-xs border border-border-subtle px-1 font-sans text-2xs text-fg-secondary',
  },
});
