import { IconButton } from '@genslate/design-system';
import type { ReactNode } from 'react';

import { useGallery } from '../../app/gallery.context';
import type { MediaDetails } from '../../ipc/gallery.types';
import {
  formatDimensions,
  formatExposure,
  formatFullDate,
  formatPlace,
} from '../../model/format.util';
import { baseName } from '../../model/path.util';
import { RatingStars } from '../viewer/rating-stars.component';

/** A link-styled button that opens a collection. */
function Jump({
  children,
  onClick,
}: {
  readonly children: ReactNode;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring cursor-pointer text-left text-accent-fg underline-offset-2 hover:underline"
    >
      {children}
    </button>
  );
}

/** Rating, favorite, then the facts: when, camera, exposure, size, place and folder. */
export function ItemFacts({ details }: { readonly details: MediaDetails }) {
  const api = useGallery();
  const go = (collection: Parameters<typeof api.setCollection>[0]) => {
    api.setMode({ type: 'browse' });
    api.setCollection(collection);
  };

  const place = details.place;
  const coordinates =
    details.latitude === null || details.longitude === null
      ? null
      : `${details.latitude.toFixed(4)}, ${details.longitude.toFixed(4)}`;

  const rows: (readonly [string, ReactNode])[] = [
    [details.takenAt === null ? 'Date' : 'Taken', formatFullDate(details.takenAt ?? details.date)],
  ];
  if (details.camera !== null) rows.push(['Camera', details.camera]);
  if (details.lens !== null) rows.push(['Lens', details.lens]);
  const exposure = formatExposure(details);
  if (exposure !== null) rows.push(['Exposure', exposure]);
  if (details.flash !== null) rows.push(['Flash', details.flash ? 'Fired' : 'Off']);
  const dimensions = formatDimensions(details.width, details.height);
  if (dimensions !== null) rows.push(['Size', dimensions]);
  if (place !== null) {
    rows.push([
      'Place',
      <Jump
        key="place"
        onClick={() => go({ type: 'place', country: place.country, city: place.city })}
      >
        {formatPlace(place)}
      </Jump>,
    ]);
  }
  if (coordinates !== null) rows.push(['Location', coordinates]);
  rows.push([
    'Folder',
    <Jump key="folder" onClick={() => go({ type: 'folder', path: details.folder })}>
      {baseName(details.folder)}
    </Jump>,
  ]);
  if (details.editedAt !== null) rows.push(['Edited', formatFullDate(details.editedAt)]);
  rows.push(['Added', formatFullDate(details.addedAt)]);

  return (
    <>
      <div className="flex items-center gap-1">
        <RatingStars
          rating={details.rating}
          disabled={details.trashed}
          onRate={(rating) => api.rate([details.id], rating)}
        />
        <span className="flex-1" />
        <IconButton
          size="sm"
          icon={details.favorite ? 'codicon:heart-filled' : 'codicon:heart'}
          label={details.favorite ? 'Remove from favorites' : 'Favorite'}
          tooltipShortcut="f"
          toggled={details.favorite}
          disabled={details.trashed}
          onClick={() => api.favorite([details.id], !details.favorite)}
        />
        <IconButton
          size="sm"
          icon="codicon:copy"
          label="Copy path"
          onClick={() => api.copyText(details.path, 'the path')}
        />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="min-w-0 cursor-text select-text break-words text-fg tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
