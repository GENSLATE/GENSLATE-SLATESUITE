import { EmptyState, ScrollArea } from '@genslate/design-system';

import type { AppEntry } from '../../ipc/launcher.types';
import { AppGroupHeader } from './app-group-header.component';
import { AppRow } from './app-row.component';
import type { AppGroup } from './catalog.model';

export interface AppListProps {
  /** Grouped browsing, or `null` while showing search results. */
  readonly groups: readonly AppGroup[] | null;
  readonly results: readonly AppEntry[];
  readonly query: string;
  readonly collapsed: ReadonlySet<string>;
  /** Position of the active option in the flattened list (duplicates — a favourite also in its category — are distinct options). */
  readonly activeIndex: number;
  readonly launchingId: string | undefined;
  /** Changes whenever the list should replay its entrance (tab switch, show). */
  readonly animationKey: string;
  readonly listboxId: string;
  readonly onToggleGroup: (groupId: string) => void;
  readonly onActivate: (index: number) => void;
  readonly onLaunch: (app: AppEntry) => void;
  readonly onToggleFavorite: (app: AppEntry) => void;
}

/**
 * The listbox of the apps well: grouped (Favorites, Recent, categories, Not installed) while
 * browsing, ranked across every source while searching. Keyboard focus stays in the search
 * box; the active option is scrolled into view.
 */
export function AppList({
  groups,
  results,
  query,
  collapsed,
  activeIndex,
  launchingId,
  animationKey,
  listboxId,
  onToggleGroup,
  onActivate,
  onLaunch,
  onToggleFavorite,
}: AppListProps) {
  const row = (app: AppEntry, index: number, showSource: boolean) => (
    <AppRow
      key={`${app.id}@${index}`}
      app={app}
      index={index}
      active={index === activeIndex}
      launching={app.id === launchingId}
      showSource={showSource}
      ref={index === activeIndex ? scrollIntoView : undefined}
      onHover={() => onActivate(index)}
      onLaunch={() => onLaunch(app)}
      onToggleFavorite={() => onToggleFavorite(app)}
    />
  );

  if (groups === null && results.length === 0) {
    return (
      <div className="launcher-fade-up grid h-full place-items-center px-4">
        <EmptyState
          size="sm"
          icon="codicon:search"
          title={`No apps match “${query.trim()}”`}
          description="Try another name, or type / for commands."
        />
      </div>
    );
  }

  let index = 0;
  return (
    <ScrollArea className="h-full" viewportClassName="px-1.5 pb-1.5" scrollShadow>
      <div
        key={animationKey}
        id={listboxId}
        role="listbox"
        aria-label={groups === null ? 'Search results' : 'Apps'}
        className="flex flex-col gap-px pt-1"
      >
        {groups === null ? (
          <>
            <div className="flex h-7 items-center px-2 font-semibold text-2xs text-fg-muted uppercase tracking-wider">
              <span className="flex-1">Results</span>
              <span className="tabular-nums">{results.length}</span>
            </div>
            {results.map((app) => row(app, index++, true))}
          </>
        ) : (
          groups.map((group) => {
            const isCollapsed = collapsed.has(group.id);
            return (
              // biome-ignore lint/a11y/useSemanticElements: option groups inside a listbox must be role="group" (WAI-ARIA); a fieldset is not allowed there.
              <div
                key={group.id}
                role="group"
                aria-label={group.label}
                className="flex flex-col gap-px"
              >
                <AppGroupHeader
                  group={group}
                  collapsed={isCollapsed}
                  onToggle={() => onToggleGroup(group.id)}
                />
                {isCollapsed ? null : group.apps.map((app) => row(app, index++, false))}
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}

/** Keeps the active option visible as the keyboard moves through the list. */
function scrollIntoView(element: HTMLDivElement | null): void {
  element?.scrollIntoView({ block: 'nearest' });
}
