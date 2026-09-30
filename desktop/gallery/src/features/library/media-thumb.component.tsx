import { cn, Icon } from '@genslate/design-system';
import { useState } from 'react';

import { useGallery } from '../../app/gallery.context';
import { THUMB_EDGE } from '../../ipc/gallery.client';
import type { MediaItem } from '../../ipc/gallery.types';

interface MediaThumbProps {
  readonly item: MediaItem;
  /** `cover` fills the box (tiles); `contain` shows the whole picture. */
  readonly fit?: 'cover' | 'contain';
  readonly className?: string;
}

/** The file's extension in capitals ("HEIC"). */
function formatLabel(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : 'FILE';
}

/**
 * A picture's thumbnail: the cached render for photos, the first frame (or the backend's
 * still) for videos, and a labelled placeholder for formats Gallery can't draw yet (HEIC,
 * RAW) or files that fail to decode.
 */
export function MediaThumb({ item, fit = 'cover', className }: MediaThumbProps) {
  const { backend } = useGallery();
  const [failed, setFailed] = useState<string | null>(null);
  const fitClass = fit === 'cover' ? 'object-cover' : 'object-contain';
  const poster = item.kind === 'video' ? backend.videoPoster(item) : null;
  const source =
    item.kind === 'video'
      ? (poster ?? `${backend.mediaUrl(item)}#t=0.5`)
      : item.thumbnail
        ? backend.thumbUrl(item, THUMB_EDGE)
        : null;

  if (source === null || failed === source) {
    return (
      <div
        data-slot="media-thumb"
        className={cn(
          'flex size-full flex-col items-center justify-center gap-1 bg-surface-sunken text-fg-muted',
          className,
        )}
      >
        <Icon
          name={item.kind === 'video' ? 'codicon:device-camera-video' : 'codicon:file-media'}
          size={20}
        />
        <span className="font-mono text-2xs tracking-wider">{formatLabel(item.name)}</span>
      </div>
    );
  }
  if (item.kind === 'video' && poster === null) {
    return (
      <video
        data-slot="media-thumb"
        src={source}
        preload="metadata"
        muted
        playsInline
        tabIndex={-1}
        onError={() => setFailed(source)}
        className={cn('pointer-events-none size-full bg-surface-sunken', fitClass, className)}
      />
    );
  }
  return (
    <img
      data-slot="media-thumb"
      src={source}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(source)}
      className={cn('size-full bg-surface-sunken', fitClass, className)}
    />
  );
}
