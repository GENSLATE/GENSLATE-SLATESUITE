import { cn, Icon } from '@genslate/design-system';
import type { MouseEvent } from 'react';

import type { MediaItem } from '../../ipc/gallery.types';
import { formatDuration, formatFullDate } from '../../model/format.util';
import { MediaThumb } from './media-thumb.component';

interface MediaTileProps {
  readonly item: MediaItem;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly selected: boolean;
  /** The keyboard cursor is here. */
  readonly cursor: boolean;
  /** Some item is selected, so every tile shows its check. */
  readonly selecting: boolean;
  readonly onClick: (event: MouseEvent, id: number) => void;
  readonly onCheck: (id: number) => void;
  readonly onOpen: (id: number) => void;
  readonly onMenu: (id: number) => void;
}

/**
 * One photo or video in the timeline or grid: its thumbnail with a selection check (on hover,
 * or always while selecting), the favorite heart, and a video's length.
 */
export function MediaTile({
  item,
  left,
  top,
  width,
  height,
  selected,
  cursor,
  selecting,
  onClick,
  onCheck,
  onOpen,
  onMenu,
}: MediaTileProps) {
  return (
    // biome-ignore lint/a11y/useFocusableInteractive lint/a11y/useKeyWithClickEvents: the list owns focus and keys (aria-activedescendant).
    <div
      id={`gallery-item-${item.id}`}
      role="option"
      aria-selected={selected}
      aria-label={`${item.kind === 'video' ? 'Video' : 'Photo'} ${item.name}, ${formatFullDate(item.date)}${item.favorite ? ', favorite' : ''}`}
      data-slot="media-tile"
      data-context-zone="media"
      data-id={item.id}
      data-selected={selected || undefined}
      onClick={(event) => onClick(event, item.id)}
      onDoubleClick={() => onOpen(item.id)}
      onContextMenu={() => onMenu(item.id)}
      style={{ left, top, width, height }}
      className={cn(
        'group/tile absolute cursor-interactive overflow-hidden bg-surface-sunken',
        'transition-[border-radius] duration-fast ease-standard',
        selected && 'rounded-md',
        cursor &&
          'group-focus-visible/view:outline-2 group-focus-visible/view:outline-focus group-focus-visible/view:outline-offset-2',
      )}
    >
      <div
        className={cn(
          'size-full transition-transform duration-fast ease-standard',
          selected && 'scale-[0.92] rounded-md',
        )}
      >
        <MediaThumb item={item} className={cn(selected && 'rounded-md')} />
      </div>
      {/* A soft shade so the white badges read on light pictures. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-media-shade to-transparent opacity-0 transition-opacity duration-fast group-hover/tile:opacity-100"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={selected ? `Deselect ${item.name}` : `Select ${item.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onCheck(item.id);
        }}
        onDoubleClick={(event) => event.stopPropagation()}
        className={cn(
          'absolute top-1.5 left-1.5 grid size-5 cursor-interactive place-items-center rounded-full transition-opacity duration-fast',
          selected
            ? 'bg-accent text-on-accent opacity-100'
            : 'bg-media-shade text-on-media opacity-0 ring-1 ring-on-media group-hover/tile:opacity-100',
          selecting && !selected && 'opacity-70',
        )}
      >
        {selected ? <Icon name="codicon:check" size={12} /> : null}
      </button>
      {item.favorite ? (
        <Icon
          name="codicon:heart-filled"
          size={14}
          className="absolute bottom-1.5 left-1.5 text-on-media drop-shadow"
          label="Favorite"
        />
      ) : null}
      {item.kind === 'video' ? (
        <span className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-sm bg-media-shade px-1 font-medium text-2xs text-on-media tabular-nums">
          <Icon name="codicon:play" size={12} />
          {item.durationMs === null ? 'Video' : formatDuration(item.durationMs)}
        </span>
      ) : null}
    </div>
  );
}
