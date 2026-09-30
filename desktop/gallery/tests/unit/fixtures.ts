import type { MediaItem } from '../../src/ipc/gallery.types';

/** A photo with sensible defaults; override what a test cares about. */
export function mediaItem(id: number, overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id,
    path: `/photos/IMG_${id}.jpg`,
    name: `IMG_${id}.jpg`,
    kind: 'image',
    width: 3000,
    height: 2000,
    date: Date.UTC(2026, 8, 20, 12) - id * 60_000,
    dated: true,
    size: 2_000_000,
    favorite: false,
    rating: 0,
    durationMs: null,
    thumbnail: true,
    preview: 'original',
    trashed: false,
    ...overrides,
  };
}
