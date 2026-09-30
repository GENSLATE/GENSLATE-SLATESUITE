import { cn, Icon } from '@genslate/design-system';
import type { MouseEvent } from 'react';

import { useGallery } from '../../app/gallery.context';
import type { MediaItem, SortKey } from '../../ipc/gallery.types';
import { formatBytes, formatDuration, formatFullDate, plural } from '../../model/format.util';
import type { Layout } from '../../model/layout.util';
import { visibleBlocks } from '../../model/layout.util';
import { MediaThumb } from './media-thumb.component';
import { useMediaSelection } from './use-media-selection.hook';
import { useViewport } from './use-viewport.hook';

const ROW = 40;
const HEADER = 28;

interface Column {
  readonly id: string;
  readonly label: string;
  readonly sort: SortKey | null;
  readonly className: string;
}

const COLUMNS: readonly Column[] = [
  { id: 'name', label: 'Name', sort: 'name', className: 'min-w-0 flex-1' },
  { id: 'date', label: 'Date taken', sort: 'taken', className: 'w-44' },
  { id: 'dimensions', label: 'Dimensions', sort: null, className: 'w-32' },
  { id: 'size', label: 'Size', sort: 'size', className: 'w-20 justify-end text-right' },
  { id: 'rating', label: 'Rating', sort: null, className: 'w-24' },
];

/** One row per item: thumbnail, name, date, dimensions, size, rating (sortable columns). */
export function DetailsView() {
  const api = useGallery();
  const { viewport, ref, element } = useViewport();
  const { items, settings } = api;
  const layout: Layout = {
    blocks: items.map((item, index) => ({
      type: 'row' as const,
      key: String(item.id),
      top: index * ROW,
      height: ROW,
      cells: [{ item, left: 0, width: viewport.width }],
    })),
    height: items.length * ROW,
    order: items.map((item) => item.id),
    rowOf: new Map(items.map((item, index) => [item.id, index])),
  };
  const selection = useMediaSelection(layout, element, HEADER);
  const chosen = new Set(api.selection.selected);
  const visible = visibleBlocks(
    layout.blocks,
    viewport.scrollTop - 400,
    viewport.scrollTop + viewport.height + 400,
  );

  const sortBy = (key: SortKey) => {
    if (key === settings.sortBy) api.updateSetting('sortDescending', !settings.sortDescending);
    else api.updateSetting('sortBy', key);
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-multiselectable
      aria-label={`${plural(items.length, 'item')} in details`}
      aria-activedescendant={
        api.selection.focus === null ? undefined : `gallery-item-${api.selection.focus}`
      }
      tabIndex={0}
      data-context-zone="view"
      onKeyDown={selection.onKeyDown}
      className="group/view scrollbar-thin relative min-h-0 flex-1 select-none overflow-auto outline-none"
    >
      <div
        data-slot="details-header"
        className="hairline-b sticky top-0 z-sticky flex h-7 items-stretch gap-3 bg-canvas pr-4 pl-15 text-fg-muted text-xs"
      >
        {COLUMNS.map((column) => {
          const active = column.sort !== null && column.sort === settings.sortBy;
          return column.sort === null ? (
            <span key={column.id} className={cn('flex items-center', column.className)}>
              {column.label}
            </span>
          ) : (
            <button
              key={column.id}
              type="button"
              tabIndex={-1}
              onClick={() => column.sort !== null && sortBy(column.sort)}
              className={cn(
                'flex cursor-interactive items-center gap-1 hover:text-fg',
                active && 'text-fg',
                column.className,
              )}
            >
              <span className="truncate">{column.label}</span>
              {active ? (
                <Icon
                  name={settings.sortDescending ? 'codicon:chevron-down' : 'codicon:chevron-up'}
                  size={12}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: a click on the empty space clears the selection; the list owns the keys. */}
      <div
        onClick={selection.onBackgroundClick}
        className="relative"
        style={{ height: layout.height + 16 }}
      >
        {visible.map((block) => {
          const item = block.type === 'row' ? block.cells[0]?.item : undefined;
          if (item === undefined) return null;
          return (
            <DetailsRow
              key={item.id}
              item={item}
              top={block.top}
              selected={chosen.has(item.id)}
              cursor={api.selection.focus === item.id}
              onClick={(event) => selection.onItemClick(event, item.id)}
              onOpen={() => selection.onItemOpen(item.id)}
              onMenu={() => selection.onItemMenu(item.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface DetailsRowProps {
  readonly item: MediaItem;
  readonly top: number;
  readonly selected: boolean;
  readonly cursor: boolean;
  readonly onClick: (event: MouseEvent) => void;
  readonly onOpen: () => void;
  readonly onMenu: () => void;
}

function DetailsRow({ item, top, selected, cursor, onClick, onOpen, onMenu }: DetailsRowProps) {
  return (
    // biome-ignore lint/a11y/useFocusableInteractive lint/a11y/useKeyWithClickEvents: the list owns focus and keys (aria-activedescendant).
    <div
      id={`gallery-item-${item.id}`}
      role="option"
      aria-selected={selected}
      data-slot="details-row"
      data-context-zone="media"
      data-id={item.id}
      onClick={onClick}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      style={{ top, height: ROW }}
      className={cn(
        'absolute inset-x-2 flex cursor-interactive items-center gap-3 rounded-control pr-2 pl-1.5 text-sm',
        selected ? 'bg-selection text-fg-strong' : 'hover:bg-fill-hover',
        cursor && 'group-focus-visible/view:outline-1 group-focus-visible/view:outline-focus',
      )}
    >
      <span className="size-8 shrink-0 overflow-hidden rounded-sm">
        <MediaThumb item={item} />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-fg">{item.name}</span>
        {item.favorite ? (
          <Icon
            name="codicon:heart-filled"
            size={12}
            className="shrink-0 text-danger-fg"
            label="Favorite"
          />
        ) : null}
        {item.kind === 'video' && item.durationMs !== null ? (
          <span className="shrink-0 text-fg-muted text-xs tabular-nums">
            {formatDuration(item.durationMs)}
          </span>
        ) : null}
      </span>
      <span className="w-44 truncate text-fg-secondary tabular-nums">
        {formatFullDate(item.date)}
        {item.dated ? '' : ' *'}
      </span>
      <span className="w-32 truncate text-fg-secondary tabular-nums">
        {item.width === null || item.height === null ? '—' : `${item.width} × ${item.height}`}
      </span>
      <span className="w-20 text-right text-fg-secondary tabular-nums">
        {formatBytes(item.size)}
      </span>
      <span
        role="img"
        className="flex w-24 items-center gap-px text-warning-fg"
        aria-label={`${item.rating} of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name={star <= item.rating ? 'codicon:star-full' : 'codicon:star-empty'}
            size={12}
            className={star <= item.rating ? undefined : 'text-fg-disabled'}
          />
        ))}
      </span>
    </div>
  );
}
