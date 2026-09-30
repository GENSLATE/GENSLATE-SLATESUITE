import { Badge, IconButton, ScrollArea, Skeleton } from '@genslate/design-system';
import { useEffect, useState } from 'react';

import { useGallery } from '../../app/gallery.context';
import type { MediaDetails, MediaItem } from '../../ipc/gallery.types';
import { formatBytes, formatDate, formatDuration, plural } from '../../model/format.util';
import { MediaThumb } from '../library/media-thumb.component';
import { DescribeTeaser } from './describe-teaser.component';
import { ItemFacts } from './item-facts.component';
import { TagEditor } from './tag-editor.component';

type Loaded =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly details: MediaDetails }
  | { readonly status: 'error' };

/**
 * The right-hand panel: everything about the current photo (camera, place, tags, albums),
 * a summary of a multiple selection, and the ✦ description to come.
 */
export function InfoPanel() {
  const api = useGallery();
  const { current, selected } = api;
  const many = api.mode.type === 'browse' && selected.length > 1;

  return (
    <aside
      aria-label="Info"
      data-slot="info-panel"
      data-context-zone="info"
      className="flex h-full min-h-0 flex-col bg-surface-panel"
    >
      <div className="hairline-b flex h-panel-header shrink-0 items-center gap-2 pr-1 pl-4">
        <h2 className="flex-1 truncate font-semibold text-2xs text-fg-muted uppercase tracking-wider">
          Info
        </h2>
        <IconButton
          size="xs"
          icon="codicon:close"
          label="Hide the info panel"
          tooltipShortcut="mod+i"
          onClick={api.toggleInfo}
        />
      </div>
      <ScrollArea className="min-h-0 flex-1" aria-label="Photo details">
        <div className="flex flex-col gap-5 p-4">
          {many ? <SelectionSummary items={selected} /> : null}
          {!many && current !== null ? <ItemDetails key={current.id} item={current} /> : null}
          {!many && current === null ? <LibrarySummary /> : null}
        </div>
      </ScrollArea>
    </aside>
  );
}

function ItemDetails({ item }: { readonly item: MediaItem }) {
  const api = useGallery();
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });

  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is the refetch signal (a new tag, a rating, a rename)
  useEffect(() => {
    let active = true;
    api.backend.details(item.id).then(
      (details) => {
        if (active) setLoaded({ status: 'ready', details });
      },
      () => {
        if (active) setLoaded({ status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [api.backend, item.id, api.revision]);

  const details = loaded.status === 'ready' ? loaded.details : null;
  const subtitle = [
    item.kind === 'video' ? 'Video' : 'Photo',
    item.durationMs === null ? null : formatDuration(item.durationMs),
    formatBytes(item.size),
  ]
    .filter((part) => part !== null)
    .join(' · ');

  return (
    <>
      {api.mode.type === 'browse' ? (
        <div className="aspect-[4/3] overflow-hidden rounded-card bg-surface-sunken">
          <MediaThumb item={item} fit="contain" />
        </div>
      ) : null}
      <div className="min-w-0">
        <h3 className="cursor-text select-text break-words font-semibold text-fg-strong text-md leading-snug">
          {item.name}
        </h3>
        <p className="text-fg-muted text-sm">{subtitle}</p>
        {item.trashed ? (
          <Badge tone="warning" size="sm" icon="codicon:trash" className="mt-1.5">
            In the Trash
          </Badge>
        ) : null}
      </div>
      {details === null ? (
        loaded.status === 'error' ? (
          <p className="text-danger-fg text-sm">Couldn’t read this file’s details.</p>
        ) : (
          <div className="flex flex-col gap-2" aria-busy>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )
      ) : (
        <>
          <ItemFacts details={details} />
          <TagEditor details={details} />
          <Albums details={details} />
        </>
      )}
      <DescribeTeaser item={item} />
    </>
  );
}

function Albums({ details }: { readonly details: MediaDetails }) {
  const api = useGallery();
  if (details.albums.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h4 className="font-semibold text-2xs text-fg-muted uppercase tracking-wider">In albums</h4>
      <div className="flex flex-wrap gap-1.5">
        {details.albums.map((album) => (
          <button
            key={album.id}
            type="button"
            onClick={() => {
              api.setMode({ type: 'browse' });
              api.setCollection({ type: 'album', id: album.id });
            }}
            className="focus-ring flex h-6 cursor-interactive items-center gap-1 rounded-full bg-fill-hover px-2.5 text-fg text-xs transition-colors duration-fast ease-standard hover:bg-fill-pressed"
          >
            {album.name}
          </button>
        ))}
      </div>
    </section>
  );
}

function SelectionSummary({ items }: { readonly items: readonly MediaItem[] }) {
  const bytes = items.reduce((sum, item) => sum + item.size, 0);
  const dates = items.map((item) => item.date);
  const first = Math.min(...dates);
  const last = Math.max(...dates);
  const videos = items.filter((item) => item.kind === 'video').length;
  const shown = items.slice(0, 6);

  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        {shown.map((item) => (
          <div key={item.id} className="aspect-square overflow-hidden rounded-sm bg-surface-sunken">
            <MediaThumb item={item} />
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-semibold text-fg-strong text-md">
          {plural(items.length, 'item')} selected
        </h3>
        <p className="text-fg-muted text-sm tabular-nums">
          {formatBytes(bytes)}
          {videos > 0 ? ` · ${plural(videos, 'video')}` : ''}
        </p>
        <p className="text-fg-muted text-sm tabular-nums">
          {formatDate(first) === formatDate(last)
            ? formatDate(first)
            : `${formatDate(first)} – ${formatDate(last)}`}
        </p>
      </div>
      <DescribeTeaser item={null} />
    </>
  );
}

function LibrarySummary() {
  const { summary } = useGallery();
  if (summary === null) return null;
  const { counts } = summary;
  if (summary.roots.length === 0) {
    return (
      <div>
        <h3 className="font-semibold text-fg-strong text-md">Nothing here yet</h3>
        <p className="text-fg-muted text-sm">Add a folder and its photos’ details show up here.</p>
      </div>
    );
  }
  const rows: readonly (readonly [string, string])[] = [
    ['Photos', counts.photos.toLocaleString()],
    ['Videos', counts.videos.toLocaleString()],
    ['Favorites', counts.favorites.toLocaleString()],
    ['Albums', summary.albums.length.toLocaleString()],
    ['Places', summary.places.length.toLocaleString()],
    ['On disk', formatBytes(counts.bytes)],
  ];
  return (
    <>
      <div>
        <h3 className="font-semibold text-fg-strong text-md">Your library</h3>
        <p className="text-fg-muted text-sm">Select a photo to see its details.</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="text-right text-fg tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
