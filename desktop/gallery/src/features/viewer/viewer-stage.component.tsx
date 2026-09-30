import { Button, cn, EmptyState, Spinner } from '@genslate/design-system';
import { useState } from 'react';

import { useGallery } from '../../app/gallery.context';
import { DISPLAY_EDGE, THUMB_EDGE } from '../../ipc/gallery.client';
import type { MediaItem } from '../../ipc/gallery.types';
import type { useZoomPan } from './use-zoom-pan.hook';

interface ViewerStageProps {
  readonly item: MediaItem;
  readonly zoom: ReturnType<typeof useZoomPan>;
}

/**
 * The picture itself: the original file (or Gallery's large render for TIFF and JPEG XL),
 * with the cached thumbnail shown while it loads; videos play in place. Formats Gallery can't
 * draw yet get a card that opens them in the default app.
 */
export function ViewerStage({ item, zoom }: ViewerStageProps) {
  const api = useGallery();
  const { backend } = api;
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  if (item.kind === 'video') {
    const source = backend.mediaUrl(item);
    const poster = backend.videoPoster(item);
    if (failed === source) {
      return (
        <div className="relative grid min-h-0 flex-1 place-items-center">
          {poster === null ? null : (
            <img
              src={poster}
              alt=""
              className="absolute inset-0 size-full object-contain opacity-40"
            />
          )}
          <EmptyState
            className="relative"
            icon="codicon:device-camera-video"
            title="This video can’t play here"
            description="Open it in your default video player."
            actions={
              <Button size="sm" onClick={() => api.open(item.id)}>
                Open in the default app
              </Button>
            }
          />
        </div>
      );
    }
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-4">
        {/* biome-ignore lint/a11y/useMediaCaption: personal videos have no caption tracks */}
        <video
          key={source}
          src={source}
          poster={poster ?? undefined}
          controls
          autoPlay
          onError={() => setFailed(source)}
          className="max-h-full max-w-full rounded-sm bg-surface-sunken"
        />
      </div>
    );
  }

  if (item.preview === 'none' || !item.thumbnail) {
    return (
      <EmptyState
        className="flex-1"
        icon="codicon:file-media"
        title="Gallery can’t show this format yet"
        description="HEIC and RAW previews are on the way. Its details are in the info panel."
        actions={
          <Button size="sm" onClick={() => api.open(item.id)}>
            Open in the default app
          </Button>
        }
      />
    );
  }

  const source =
    item.preview === 'original' ? backend.mediaUrl(item) : backend.thumbUrl(item, DISPLAY_EDGE);
  const placeholder = backend.thumbUrl(item, THUMB_EDGE);
  const ready = loaded === source;

  return (
    <div
      data-slot="viewer-stage"
      {...zoom.handlers}
      className={cn(
        'relative min-h-0 flex-1 overflow-hidden',
        zoom.zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
      )}
    >
      <div
        className="absolute inset-4 transition-transform duration-fast ease-standard"
        style={zoom.style}
      >
        {ready ? null : (
          <img
            src={placeholder}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute inset-0 size-full object-contain blur-sm"
          />
        )}
        {failed === source ? null : (
          <img
            key={source}
            src={source}
            alt={item.name}
            draggable={false}
            onLoad={() => setLoaded(source)}
            onError={() => setFailed(source)}
            className={cn(
              'absolute inset-0 size-full object-contain transition-opacity duration-base ease-standard',
              ready ? 'opacity-100' : 'opacity-0',
            )}
          />
        )}
      </div>
      {ready || failed === source ? null : (
        <Spinner size={16} label="Loading the full picture" className="absolute right-4 bottom-4" />
      )}
    </div>
  );
}
