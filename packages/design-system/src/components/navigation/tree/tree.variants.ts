import { tv } from '../../../utils/cn.util';

export const treeVariants = tv({
  slots: {
    root: 'group/tree m-0 select-none list-none p-0 py-0.5 text-base outline-none',
    item: 'm-0 list-none p-0 outline-none [&:focus-visible>[data-slot=tree-item-row]]:outline-focus',
    row: [
      'relative flex h-row-sm cursor-default items-center gap-1.5 pr-2 text-fg',
      'outline-2 outline-transparent -outline-offset-2',
      'hover:bg-fill-hover',
      'data-selected:bg-selection-inactive data-selected:text-fg-strong',
      'group-focus-within/tree:data-selected:bg-selection',
      'data-disabled:pointer-events-none data-disabled:text-fg-disabled',
    ],
    chevron: [
      'flex size-4 shrink-0 items-center justify-center text-fg-muted',
      'transition-transform duration-fast ease-standard data-expanded:rotate-90',
    ],
    spacer: 'size-4 shrink-0',
    icon: 'text-fg-muted',
    label: 'truncate-flex flex-1',
    trailing: 'ml-auto shrink-0 pl-2 text-fg-muted text-sm',
    guide:
      'pointer-events-none absolute inset-y-0 w-px bg-border-subtle transition-opacity duration-fast ease-standard',
    group: 'm-0 list-none p-0',
  },
  variants: {
    indentGuides: {
      always: {},
      hover: {
        guide: 'opacity-0 group-focus-within/tree:opacity-100 group-hover/tree:opacity-100',
      },
      none: { guide: 'hidden' },
    },
  },
  defaultVariants: { indentGuides: 'hover' },
});
