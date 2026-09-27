import { Badge, cn, Icon, IconButton } from '@genslate/design-system';
import type { CSSProperties, Ref } from 'react';

import type { AppEntry } from '../../ipc/launcher.types';
import { AppIcon } from './app-icon.component';
import { sourceOf } from './catalog.model';

export interface AppRowProps {
  readonly app: AppEntry;
  /** Keyboard / pointer highlight (the combobox's active option). */
  readonly active: boolean;
  /** Plays the launch "pop". */
  readonly launching: boolean;
  /** Show which tab the app comes from (search results). */
  readonly showSource: boolean;
  /** Position for the staggered entrance. */
  readonly index: number;
  readonly onLaunch: () => void;
  readonly onHover: () => void;
  readonly onToggleFavorite: () => void;
  readonly ref?: Ref<HTMLDivElement> | undefined;
}

const SOURCE_LABEL = {
  genslate: 'GENSLATE',
  portableapps: 'PortableApps',
  portapps: 'portapps',
} as const;

/**
 * A two-line app row: icon tile, name, one-line description; running dot and problem badges
 * for GENSLATE apps; a favourite star and launch chevron on hover.
 */
export function AppRow({
  app,
  active,
  launching,
  showSource,
  index,
  onLaunch,
  onHover,
  onToggleFavorite,
  ref,
}: AppRowProps) {
  const source = sourceOf(app.id);
  const genslate = source === 'genslate';
  const unavailable = app.status !== 'ready' && app.status !== 'running';
  const style = { '--launcher-row-index': Math.min(index, 12) } as CSSProperties;

  return (
    <div
      ref={ref}
      id={optionId(index)}
      role="option"
      aria-selected={active}
      aria-disabled={unavailable || undefined}
      data-slot="app-row"
      data-app-id={app.id}
      data-active={active || undefined}
      data-status={app.status}
      style={style}
      // Options are "virtually" focused through the search box (aria-activedescendant): keep
      // real focus there on click, but stay operable if something focuses the row directly.
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onLaunch();
        }
      }}
      onClick={onLaunch}
      onPointerMove={active ? undefined : onHover}
      className={cn(
        'launcher-row-in group/row relative flex h-launcher-row cursor-default items-center gap-2.5 rounded-lg px-2',
        'transition-colors duration-fast ease-standard',
        'active:bg-fill-pressed data-active:bg-fill-hover',
        launching && 'bg-accent-subtle',
      )}
    >
      <span className={cn('relative shrink-0', launching && 'launcher-pop')}>
        <AppIcon app={app} />
        {app.status === 'running' && genslate ? <RunningDot /> : null}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              'truncate font-medium text-base',
              unavailable ? 'text-fg-muted' : 'text-fg-strong',
            )}
          >
            {app.name}
          </span>
          {showSource && !genslate ? (
            <span className="shrink-0 rounded-sm bg-fill-hover px-1 text-2xs text-fg-muted">
              {SOURCE_LABEL[source]}
            </span>
          ) : null}
        </span>
        <span className="truncate text-fg-muted text-xs">{app.description || app.category}</span>
      </span>

      {genslate ? <StatusBadge app={app} /> : null}

      <span
        className={cn(
          'flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-fast',
          'group-data-active/row:opacity-100',
        )}
      >
        {!unavailable ? (
          <IconButton
            size="xs"
            tabIndex={-1}
            label={app.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
            icon={app.favorite ? 'codicon:star-full' : 'codicon:star-empty'}
            toggled={app.favorite}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
          />
        ) : null}
        <Icon
          name="codicon:chevron-right"
          size={14}
          className="text-fg-muted transition-transform duration-fast ease-standard group-data-active/row:translate-x-0.5"
        />
      </span>
    </div>
  );
}

/** DOM id of the option at `index`, for `aria-activedescendant`. */
export function optionId(index: number): string {
  return `app-option-${index}`;
}

function RunningDot() {
  return (
    <span
      role="img"
      aria-label="Running"
      className="absolute -right-0.5 -bottom-0.5 grid size-2.5 place-items-center rounded-full bg-surface-sunken"
    >
      <span className="launcher-ping absolute size-1.5 rounded-full bg-accent" />
      <span className="relative size-1.5 rounded-full bg-accent" />
    </span>
  );
}

function StatusBadge({ app }: { app: AppEntry }) {
  switch (app.status) {
    case 'missing-exe':
      return (
        <Badge tone="warning" size="sm">
          Missing
        </Badge>
      );
    case 'broken-manifest':
      return (
        <Badge tone="danger" size="sm">
          Broken
        </Badge>
      );
    case 'not-installed':
      return (
        <Badge tone="neutral" variant="outline" size="sm">
          Not installed
        </Badge>
      );
    default:
      return null;
  }
}
