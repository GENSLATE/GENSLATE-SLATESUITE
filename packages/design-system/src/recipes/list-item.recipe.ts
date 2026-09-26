import { tv } from '../utils/cn.util';

/**
 * Rows in menus, selects, command palettes and comboboxes. Highlight uses the accent like
 * native macOS menus; destructive rows turn red when highlighted.
 */
export const listItem = tv({
  base: [
    'group/item relative flex h-menu-item w-full cursor-default select-none items-center gap-2 rounded-menu-item px-2 text-base text-fg outline-none',
    'data-highlighted:bg-accent data-highlighted:text-on-accent',
    'data-disabled:pointer-events-none data-disabled:text-fg-disabled',
  ],
  variants: {
    tone: {
      default: '',
      danger: 'text-danger-fg data-highlighted:bg-danger data-highlighted:text-on-danger',
    },
    inset: {
      true: 'pl-7',
    },
  },
  defaultVariants: { tone: 'default' },
});

/** Trailing shortcut / hint text inside a list item. */
export const listItemHint = tv({
  base: 'ml-auto pl-4 text-fg-muted text-sm tabular-nums group-data-highlighted/item:text-on-accent',
});
