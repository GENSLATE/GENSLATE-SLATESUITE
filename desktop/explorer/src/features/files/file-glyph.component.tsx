import { cn, Icon } from '@genslate/design-system';
import { useState } from 'react';

import { useExplorer } from '../../app/explorer.context';
import type { Entry } from '../../ipc/explorer.types';
import { entryIcon } from '../../model/file-icon.util';

/** The shell won't decode larger files (matches `thumbnail.rs`). */
const THUMBNAIL_LIMIT = 256 * 1024 * 1024;
/** Long edge of the cached thumbnail: sharp at 2× in the 64px icon frame. */
const THUMBNAIL_EDGE = 128;

interface FileGlyphProps {
  readonly entry: Entry;
  /** `lg`: the icons view (64px) · `md`: tiles (40px). */
  readonly size: 'lg' | 'md';
}

/**
 * The large picture of a file or folder for the icon views: an image thumbnail, a folder, or a
 * page with the kind's glyph and the file's extension.
 */
export function FileGlyph({ entry, size }: FileGlyphProps) {
  const { backend } = useExplorer();
  const [broken, setBroken] = useState(false);
  const large = size === 'lg';
  const frame = large ? 'size-16' : 'size-10';

  if (entry.kind === 'image' && !broken && (entry.size === null || entry.size <= THUMBNAIL_LIMIT)) {
    return (
      <span data-slot="file-glyph" className={cn('grid shrink-0 place-items-center', frame)}>
        <img
          src={
            // The webview draws SVGs itself; everything else comes from the thumbnail cache.
            entry.extension === 'svg'
              ? backend.previewUrl(entry.path)
              : backend.thumbnailUrl(entry.path, THUMBNAIL_EDGE, entry.modified)
          }
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setBroken(true)}
          className="max-h-full max-w-full rounded-xs object-contain shadow-control ring-1 ring-border-subtle"
        />
      </span>
    );
  }

  if (entry.isDir) {
    return (
      <span
        data-slot="file-glyph"
        className={cn('relative grid shrink-0 place-items-center', frame)}
        aria-hidden
      >
        <span className={cn('relative flex flex-col', large ? 'h-11 w-14' : 'h-7 w-9')}>
          <span
            className={cn(
              'rounded-t-[3px] border border-accent-border border-b-0 bg-accent-subtle',
              large ? 'h-2 w-6' : 'h-1.5 w-4',
            )}
          />
          <span
            className={cn(
              'flex-1 rounded-b-[5px] rounded-tr-[5px] border border-accent-border bg-accent-subtle',
              'shadow-inset',
            )}
          />
        </span>
        {entry.symlink ? <LinkBadge /> : null}
      </span>
    );
  }

  return (
    <span
      data-slot="file-glyph"
      className={cn('relative grid shrink-0 place-items-center', frame)}
      aria-hidden
    >
      <span
        className={cn(
          'relative flex flex-col items-center justify-center gap-0.5 border border-border bg-surface-raised text-fg-muted shadow-control',
          '[clip-path:polygon(0_0,72%_0,100%_22%,100%_100%,0_100%)]',
          large ? 'h-15 w-12 rounded-[4px]' : 'h-9.5 w-7.5 rounded-[3px]',
        )}
      >
        <span
          className={cn(
            'absolute top-0 right-0 rounded-bl-[3px] bg-fill-pressed',
            large ? 'size-3.5' : 'size-2',
          )}
        />
        <Icon name={entryIcon(entry)} size={large ? 20 : 14} />
        {large && entry.extension !== null ? (
          <span className="max-w-10 truncate font-semibold text-2xs text-fg-secondary uppercase tracking-wide">
            {entry.extension}
          </span>
        ) : null}
      </span>
      {entry.symlink ? <LinkBadge /> : null}
    </span>
  );
}

function LinkBadge() {
  return (
    <span className="absolute bottom-0 left-0 grid size-4 place-items-center rounded-xs bg-surface-raised text-fg-secondary shadow-control ring-1 ring-border-subtle">
      <Icon name="codicon:arrow-small-right" size={12} />
    </span>
  );
}
