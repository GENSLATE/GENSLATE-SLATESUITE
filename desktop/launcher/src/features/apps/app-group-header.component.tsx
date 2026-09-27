import type { CodiconRef } from '@genslate/design-system';
import { cn, Icon } from '@genslate/design-system';

import type { AppGroup } from './catalog.model';

const GROUP_ICON: Record<AppGroup['kind'], CodiconRef> = {
  favorites: 'codicon:star-full',
  recent: 'codicon:history',
  category: 'codicon:layers',
  unavailable: 'codicon:cloud-download',
};

export interface AppGroupHeaderProps {
  readonly group: AppGroup;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

/** Sticky, collapsible section header inside the apps well. */
export function AppGroupHeader({ group, collapsed, onToggle }: AppGroupHeaderProps) {
  return (
    <button
      type="button"
      data-slot="app-group-header"
      aria-expanded={!collapsed}
      onClick={onToggle}
      className={cn(
        'sticky top-0 z-raised flex h-7 w-full cursor-default items-center gap-1.5 rounded-md bg-surface-sunken px-2',
        'font-semibold text-2xs text-fg-muted uppercase tracking-wider',
        'focus-ring-inset transition-colors duration-fast hover:text-fg-secondary',
      )}
    >
      <Icon
        name="codicon:chevron-down"
        size={12}
        className={cn('transition-transform duration-base ease-spring', collapsed && '-rotate-90')}
      />
      {group.kind === 'category' ? null : <Icon name={GROUP_ICON[group.kind]} size={12} />}
      <span className="flex-1 truncate text-left">{group.label}</span>
      <span className="font-medium tabular-nums">{group.apps.length}</span>
    </button>
  );
}
