import { tv } from '../../../utils/cn.util';

/** macOS source list at VS Code density: 28px rows, inset pill selection, quiet section titles. */
export const sidebarVariants = tv({
  slots: {
    root: 'chrome flex h-full min-h-0 w-full min-w-0 flex-col bg-surface-sidebar text-fg',
    header: 'flex h-panel-header shrink-0 items-center gap-2 pr-2 pl-4',
    headerTitle:
      'truncate-flex flex-1 font-semibold text-2xs text-fg-muted uppercase tracking-wider',
    content: 'min-h-0 flex-1',
    contentViewport: 'py-1',
    footer: 'hairline-t flex shrink-0 items-center gap-1 px-2 py-1.5',
    section: 'group/section flex flex-col pb-2',
    sectionHeader: 'flex h-6 items-center pr-2 pl-2',
    sectionTrigger: [
      'group/trigger flex h-6 min-w-0 flex-1 items-center gap-1 rounded-sm px-2 text-left',
      'font-semibold text-2xs text-fg-muted uppercase tracking-wider',
      'focus-ring-inset transition-colors duration-fast ease-standard hover:text-fg-secondary',
    ],
    sectionChevron: [
      'text-fg-muted transition-[opacity,rotate] duration-fast ease-standard',
      // Visible while collapsed; while open it only appears on hover / keyboard focus.
      'group-data-panel-open/trigger:rotate-90 group-data-panel-open/trigger:opacity-0',
      'group-hover/section:group-data-panel-open/trigger:opacity-100',
      'group-focus-visible/trigger:group-data-panel-open/trigger:opacity-100',
    ],
    sectionActions:
      'flex items-center gap-0.5 opacity-0 transition-opacity duration-fast group-focus-within/section:opacity-100 group-hover/section:opacity-100',
    sectionPanel: 'flex flex-col gap-px data-closed:hidden',
    item: [
      'group/item no-underline! relative mx-2 flex h-row-md min-w-0 shrink-0 cursor-default items-center gap-2 rounded-control px-2 text-left text-base text-fg',
      'focus-ring-inset transition-colors duration-fast ease-standard',
      'hover:bg-fill-hover active:bg-fill-pressed',
      'aria-[current]:bg-selection aria-[current]:text-fg-strong',
      'window-inactive:aria-[current]:bg-selection-inactive window-inactive:aria-[current]:text-fg',
      'data-disabled:pointer-events-none data-disabled:text-fg-disabled',
    ],
    itemIcon: [
      'flex shrink-0 text-fg-muted transition-colors duration-fast',
      'group-aria-[current]/item:text-accent-fg window-inactive:group-aria-[current]/item:text-fg-muted',
    ],
    itemLabel: 'truncate-flex flex-1',
    itemCount:
      'shrink-0 text-fg-muted text-sm tabular-nums group-aria-[current]/item:text-fg-secondary',
  },
});
