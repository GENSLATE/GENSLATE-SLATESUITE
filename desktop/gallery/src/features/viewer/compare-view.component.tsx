import { Button, IconButton } from '@genslate/design-system';
import { useEffect, useEffectEvent } from 'react';

import { useGallery } from '../../app/gallery.context';
import type { MediaItem } from '../../ipc/gallery.types';
import { formatBytes, formatDimensions, formatFullDate } from '../../model/format.util';
import { RatingStars } from './rating-stars.component';
import { useZoomPan } from './use-zoom-pan.hook';
import { ViewerStage } from './viewer-stage.component';

/** Two photos side by side, to pick the better shot: favorite, rate or trash either one. */
export function CompareView({ ids }: { readonly ids: readonly [number, number] }) {
  const api = useGallery();
  const left = api.itemById(ids[0]);
  const right = api.itemById(ids[1]);
  const close = () => api.setMode({ type: 'browse' });

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || api.dialog.type !== 'none') return;
    event.preventDefault();
    close();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  // One of them left the list (trashed): back to the grid.
  useEffect(() => {
    if ((left === undefined || right === undefined) && !api.loading) close();
  });

  return (
    <section
      aria-label="Compare"
      data-slot="compare-view"
      data-context-zone="viewer"
      className="flex min-h-0 flex-1 flex-col bg-canvas"
    >
      <div className="hairline-b flex h-12 shrink-0 items-center gap-2 px-2">
        <IconButton
          size="md"
          icon="codicon:arrow-left"
          label="Back to the photos"
          tooltipShortcut="escape"
          onClick={close}
        />
        <span className="font-medium text-fg-strong text-sm">Compare</span>
        <span className="text-fg-muted text-xs">Keep the better shot, trash the other.</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-border-subtle">
        {left === undefined ? <div /> : <Side item={left} />}
        {right === undefined ? <div /> : <Side item={right} />}
      </div>
    </section>
  );
}

function Side({ item }: { readonly item: MediaItem }) {
  const api = useGallery();
  const zoom = useZoomPan();
  const facts = [
    formatDimensions(item.width, item.height),
    formatBytes(item.size),
    formatFullDate(item.date),
  ].filter((fact) => fact !== null);

  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <ViewerStage key={item.id} item={item} zoom={zoom} />
      <div className="hairline-t flex h-12 shrink-0 items-center gap-1 px-3">
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate font-medium text-fg-strong text-sm">{item.name}</span>
          <span className="truncate text-fg-muted text-xs tabular-nums">{facts.join(' · ')}</span>
        </div>
        <IconButton
          icon={item.favorite ? 'codicon:heart-filled' : 'codicon:heart'}
          label={item.favorite ? 'Remove from favorites' : 'Favorite'}
          toggled={item.favorite}
          onClick={() => api.favorite([item.id], !item.favorite)}
        />
        <RatingStars rating={item.rating} onRate={(rating) => api.rate([item.id], rating)} />
        <Button
          size="sm"
          variant="ghost"
          leadingIcon="codicon:trash"
          onClick={() => api.trash([item.id])}
        >
          Trash
        </Button>
      </div>
    </div>
  );
}
