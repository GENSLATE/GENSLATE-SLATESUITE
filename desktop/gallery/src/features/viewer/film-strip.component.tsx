import { cn } from '@genslate/design-system';
import { useEffect, useRef } from 'react';

import type { MediaItem } from '../../ipc/gallery.types';
import { MediaThumb } from '../library/media-thumb.component';

/** Thumbnails shown each side of the current one (the strip is windowed). */
const REACH = 40;

interface FilmStripProps {
  readonly items: readonly MediaItem[];
  readonly currentId: number;
  readonly onPick: (id: number) => void;
}

/** A row of neighbouring thumbnails under the viewer; the current one stays centred. */
export function FilmStrip({ items, currentId, onPick }: FilmStripProps) {
  const index = items.findIndex((item) => item.id === currentId);
  const start = Math.max(0, index - REACH);
  const shown = items.slice(start, index + REACH + 1);
  const current = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // `currentId` changes which button holds the ref; centre it (not in happy-dom tests).
    if (currentId >= 0)
      current.current?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [currentId]);

  return (
    <div
      role="toolbar"
      aria-label="Film strip"
      data-slot="film-strip"
      className="scrollbar-thin hairline-t flex h-18 shrink-0 items-center gap-1 overflow-x-auto px-3"
    >
      {shown.map((item) => {
        const active = item.id === currentId;
        return (
          <button
            key={item.id}
            ref={active ? current : undefined}
            type="button"
            aria-label={item.name}
            aria-current={active || undefined}
            onClick={() => onPick(item.id)}
            className={cn(
              'focus-ring h-12 shrink-0 cursor-interactive overflow-hidden rounded-sm transition-[opacity,width] duration-fast ease-standard',
              active ? 'w-16 opacity-100 ring-2 ring-accent' : 'w-9 opacity-60 hover:opacity-100',
            )}
          >
            <MediaThumb item={item} />
          </button>
        );
      })}
    </div>
  );
}
