import { cn, IconButton } from '@genslate/design-system';
import { useWindowControls } from '@genslate/tauri-bridge';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { useGallery } from '../../app/gallery.context';
import { DISPLAY_EDGE } from '../../ipc/gallery.client';
import type { MediaItem } from '../../ipc/gallery.types';
import { formatFullDate } from '../../model/format.util';

/** How long the controls stay after the pointer stops. */
const IDLE_MS = 2500;

/** Photos the slideshow can show (videos and formats without a render are skipped). */
function showable(items: readonly MediaItem[]): readonly MediaItem[] {
  return items.filter((item) => item.kind === 'image' && item.thumbnail && !item.trashed);
}

/**
 * Fullscreen slideshow of the current list from `startId`, cross-fading every
 * `slideshow-seconds`. Space pauses, the arrows step, Escape leaves (and ends fullscreen).
 */
export function Slideshow({ startId }: { readonly startId: number }) {
  const api = useGallery();
  const { setFullscreen } = useWindowControls();
  const photos = showable(api.items);
  const startIndex = Math.max(
    0,
    photos.findIndex((item) => item.id === startId),
  );
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(true);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = photos.length;
  const current = photos[index % Math.max(1, count)];
  const step = (delta: number) => setIndex((value) => (value + delta + count) % Math.max(1, count));

  const leave = () => {
    setFullscreen(false).catch((error: unknown) => api.report('Couldn’t leave fullscreen', error));
    api.setMode(current === undefined ? { type: 'browse' } : { type: 'view', id: current.id });
  };

  // Fullscreen while it runs.
  const enter = useEffectEvent(() => {
    setFullscreen(true).catch((error: unknown) => api.report('Couldn’t go fullscreen', error));
  });
  useEffect(() => {
    enter();
  }, []);

  // Advance on a timer while playing.
  // biome-ignore lint/correctness/useExhaustiveDependencies: index restarts the timer after a manual step
  useEffect(() => {
    if (!playing || count < 2) return;
    const timer = setTimeout(
      () => setIndex((value) => (value + 1) % count),
      api.settings.slideshowSeconds * 1000,
    );
    return () => clearTimeout(timer);
  }, [playing, count, index, api.settings.slideshowSeconds]);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape') leave();
    else if (event.key === ' ') setPlaying((value) => !value);
    else if (event.key === 'ArrowRight') step(1);
    else if (event.key === 'ArrowLeft') step(-1);
    else return;
    event.preventDefault();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  useEffect(
    () => () => {
      if (idleTimer.current !== null) clearTimeout(idleTimer.current);
    },
    [],
  );
  const wake = () => {
    setIdle(false);
    if (idleTimer.current !== null) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Slideshow"
      data-slot="slideshow"
      data-context-menu="none"
      onPointerMove={wake}
      className={cn('fixed inset-0 z-dialog bg-canvas', idle && 'cursor-none')}
    >
      {photos.map((item, position) => {
        // Only the current photo and its neighbours are in the page.
        const near =
          Math.abs(position - index) <= 1 ||
          (count > 2 && Math.abs(position - index) === count - 1);
        if (!near) return null;
        return (
          <img
            key={item.id}
            src={api.backend.thumbUrl(item, DISPLAY_EDGE)}
            alt={position === index ? item.name : ''}
            aria-hidden={position !== index}
            draggable={false}
            className={cn(
              'absolute inset-0 size-full select-none object-contain transition-opacity duration-slow ease-standard',
              position === index ? 'opacity-100' : 'opacity-0',
            )}
          />
        );
      })}
      {current === undefined ? (
        <p className="grid h-full place-items-center text-fg-muted">No photos to show.</p>
      ) : null}
      <div
        className={cn(
          'surface-glass absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-popover p-1.5 pl-4 shadow-popover transition-opacity duration-base ease-standard',
          idle ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
      >
        <div className="mr-3 flex min-w-0 max-w-64 flex-col leading-tight">
          <span className="truncate font-medium text-fg-strong text-sm">{current?.name}</span>
          <span className="truncate text-fg-muted text-xs tabular-nums">
            {current === undefined ? '' : formatFullDate(current.date)} · {index + 1} of {count}
          </span>
        </div>
        <IconButton
          icon="codicon:chevron-left"
          label="Previous"
          tooltipShortcut="left"
          onClick={() => step(-1)}
        />
        <IconButton
          icon={playing ? 'codicon:debug-pause' : 'codicon:play'}
          label={playing ? 'Pause' : 'Play'}
          tooltipShortcut="space"
          onClick={() => setPlaying((value) => !value)}
        />
        <IconButton
          icon="codicon:chevron-right"
          label="Next"
          tooltipShortcut="right"
          onClick={() => step(1)}
        />
        <IconButton
          icon="codicon:close"
          label="End the slideshow"
          tooltipShortcut="escape"
          onClick={leave}
        />
      </div>
    </div>
  );
}
