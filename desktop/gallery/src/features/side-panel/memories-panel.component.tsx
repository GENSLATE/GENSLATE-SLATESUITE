import { FeatureTeaser, FeatureTeaserSample, Icon, ScrollArea } from '@genslate/design-system';

import { useGallery } from '../../app/gallery.context';
import type { MediaItem } from '../../ipc/gallery.types';
import { countryName, formatMonthTitle } from '../../model/format.util';
import { MediaThumb } from '../library/media-thumb.component';

interface SampleMemory {
  readonly title: string;
  readonly subtitle: string;
  readonly cover: MediaItem | undefined;
}

/**
 * The Memories tab, a preview: trips and moments put together from your library (places,
 * dates, the best shots) as stories and slideshows.
 */
export function MemoriesPanel() {
  const { summary, items, itemById } = useGallery();
  const places = summary?.places ?? [];
  const firstImage = items.find((item) => item.kind === 'image' && item.thumbnail);

  // Build the samples from the real library where it can, so the preview feels like yours.
  const memories: SampleMemory[] = places.slice(0, 3).map((place) => {
    const cover = place.cover === null ? undefined : itemById(place.cover);
    return {
      title: `${place.city}, ${countryName(place.country)}`,
      subtitle:
        cover === undefined
          ? `${place.count.toLocaleString()} photos`
          : `${formatMonthTitle(cover.date)} · ${place.count.toLocaleString()} photos`,
      cover,
    };
  });
  if (memories.length === 0) {
    memories.push({ title: 'A year ago today', subtitle: 'Your best shots', cover: firstImage });
  }

  return (
    <ScrollArea className="min-h-0 flex-1" aria-label="Memories">
      <FeatureTeaser icon="codicon:history" title="Memories">
        Trips and moments, gathered from your photos’ places and dates, with the best shots picked
        for you and ready to play as a slideshow.
      </FeatureTeaser>
      <FeatureTeaserSample label="Example">
        <div className="flex flex-col gap-2 pb-4">
          {memories.map((memory) => (
            <div
              key={memory.title}
              className="relative h-28 overflow-hidden rounded-card bg-surface-sunken"
            >
              {memory.cover === undefined ? null : <MediaThumb item={memory.cover} />}
              <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 bg-media-shade px-3 py-2 text-on-media">
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate font-semibold text-sm">{memory.title}</p>
                  <p className="truncate text-xs opacity-80">{memory.subtitle}</p>
                </div>
                <Icon name="codicon:play-circle" size={20} />
              </div>
            </div>
          ))}
        </div>
      </FeatureTeaserSample>
    </ScrollArea>
  );
}
