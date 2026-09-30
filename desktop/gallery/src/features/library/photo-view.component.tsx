import { cn } from '@genslate/design-system';

import { useGallery } from '../../app/gallery.context';
import type { ThumbnailSize } from '../../ipc/gallery.types';
import { plural } from '../../model/format.util';
import {
  gridLayout,
  groupByDate,
  type Layout,
  timelineLayout,
  visibleBlocks,
} from '../../model/layout.util';
import { DateScrubber } from './date-scrubber.component';
import { MediaTile } from './media-tile.component';
import { useMediaSelection } from './use-media-selection.hook';
import { useViewport } from './use-viewport.hook';

/** Timeline row heights and grid tile sizes per thumbnail size. */
const ROW_HEIGHT: Readonly<Record<ThumbnailSize, number>> = { small: 120, medium: 180, large: 260 };
const TILE: Readonly<Record<ThumbnailSize, number>> = { small: 112, medium: 164, large: 240 };
const GAP = 4;
const HEADER = 44;
const PAD_X = 16;
/** Room kept free on the right for the date scrubber. */
const SCRUBBER = 36;
const PAD_TOP = 4;
/** Rows rendered beyond the viewport, so fast scrolling doesn't flash. */
const OVERSCAN = 600;

/**
 * The timeline (justified rows under date headers) and the grid (square tiles). Only the rows
 * on screen are rendered; the list is one focusable `listbox` with the tiles as options.
 */
export function PhotoView({ variant }: { readonly variant: 'timeline' | 'grid' }) {
  const api = useGallery();
  const { viewport, ref, element } = useViewport();
  const { settings, items } = api;
  const width = Math.max(0, viewport.width - PAD_X * 2 - (variant === 'timeline' ? SCRUBBER : 0));
  // Date headers only make sense when the list is in date order.
  const byDate = settings.sortBy === 'taken';
  const layout: Layout =
    variant === 'grid'
      ? gridLayout(items, { width, tile: TILE[settings.thumbnailSize], gap: GAP })
      : timelineLayout(
          byDate
            ? groupByDate(items, settings.groupBy)
            : [{ key: 'all', title: '', date: 0, items }],
          { width, rowHeight: ROW_HEIGHT[settings.thumbnailSize], gap: GAP, headerHeight: HEADER },
        );
  const selection = useMediaSelection(layout, element, PAD_TOP);
  const chosen = new Set(api.selection.selected);
  const selecting = chosen.size > 0;
  const visible = visibleBlocks(
    layout.blocks,
    viewport.scrollTop - OVERSCAN - PAD_TOP,
    viewport.scrollTop + viewport.height + OVERSCAN,
  );

  return (
    <div className="relative flex min-h-0 flex-1">
      <div
        ref={ref}
        role="listbox"
        aria-multiselectable
        aria-label={`${plural(items.length, 'item')} in the ${variant}`}
        aria-activedescendant={
          api.selection.focus === null ? undefined : `gallery-item-${api.selection.focus}`
        }
        tabIndex={0}
        data-context-zone="view"
        onKeyDown={selection.onKeyDown}
        className="group/view scrollbar-thin relative min-h-0 flex-1 select-none overflow-y-auto overflow-x-hidden outline-none"
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: a click on the empty space clears the selection; the list owns the keys. */}
        <div
          onClick={selection.onBackgroundClick}
          className="relative"
          style={{ height: layout.height + PAD_TOP + 24, marginLeft: PAD_X, marginRight: PAD_X }}
        >
          {visible.map((block) =>
            block.type === 'header' ? (
              <SectionHeader
                key={block.key}
                top={block.top + PAD_TOP}
                title={block.section.title}
                ids={block.section.items.map((item) => item.id)}
              />
            ) : (
              block.cells.map((cell) => (
                <MediaTile
                  key={cell.item.id}
                  item={cell.item}
                  left={cell.left}
                  top={block.top + PAD_TOP}
                  width={cell.width}
                  height={block.height}
                  selected={chosen.has(cell.item.id)}
                  cursor={api.selection.focus === cell.item.id}
                  selecting={selecting}
                  onClick={selection.onItemClick}
                  onCheck={selection.onItemCheck}
                  onOpen={selection.onItemOpen}
                  onMenu={selection.onItemMenu}
                />
              ))
            ),
          )}
        </div>
      </div>
      {variant === 'timeline' && byDate ? (
        <DateScrubber
          layout={layout}
          element={element}
          scrollTop={viewport.scrollTop}
          height={viewport.height}
        />
      ) : null}
    </div>
  );
}

interface SectionHeaderProps {
  readonly top: number;
  readonly title: string;
  readonly ids: readonly number[];
}

/** A day (month, year) title with a check that selects the whole section. */
function SectionHeader({ top, title, ids }: SectionHeaderProps) {
  const api = useGallery();
  const chosen = new Set(api.selection.selected);
  const all = ids.every((id) => chosen.has(id));

  const toggle = () => {
    const rest = api.selection.selected.filter((id) => !ids.includes(id));
    const selected = all ? rest : [...rest, ...ids];
    api.select({ selected, anchor: ids[0] ?? null, focus: ids[0] ?? null });
  };

  return (
    <div
      data-slot="section-header"
      style={{ top, height: HEADER }}
      className="group/header absolute inset-x-0 flex items-end gap-2 pb-2"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={all ? `Deselect ${title}` : `Select all from ${title}`}
        onClick={toggle}
        className={cn(
          'grid size-4 cursor-interactive place-items-center rounded-full border transition-opacity duration-fast',
          all
            ? 'border-accent bg-accent text-on-accent opacity-100'
            : 'border-border-strong opacity-0 group-hover/header:opacity-100',
        )}
      >
        {all ? <span className="size-1.5 rounded-full bg-on-accent" /> : null}
      </button>
      <h3 className="font-semibold text-fg-strong text-md">{title}</h3>
      <span className="text-fg-muted text-xs tabular-nums">{plural(ids.length, 'item')}</span>
    </div>
  );
}
