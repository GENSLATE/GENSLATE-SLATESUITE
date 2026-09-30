/** Names, icons and identity for collections (what a view lists). */
import type { CodiconRef } from '@genslate/design-system';

import type { Collection, Counts, Summary } from '../ipc/gallery.types';
import { countryName } from './format.util';
import { baseName } from './path.util';

type Smart = Exclude<Collection['type'], 'album' | 'folder' | 'tag' | 'place'>;

/** The smart collections, in side-panel order. */
export const SMART: readonly {
  readonly type: Smart;
  readonly label: string;
  readonly icon: CodiconRef;
  readonly count: keyof Counts;
}[] = [
  { type: 'all', label: 'All photos', icon: 'codicon:device-camera', count: 'all' },
  { type: 'favorites', label: 'Favorites', icon: 'codicon:heart', count: 'favorites' },
  { type: 'videos', label: 'Videos', icon: 'codicon:device-camera-video', count: 'videos' },
  { type: 'screenshots', label: 'Screenshots', icon: 'codicon:screen-full', count: 'screenshots' },
  { type: 'recent', label: 'Recently added', icon: 'codicon:history', count: 'recent' },
  { type: 'edited', label: 'Edited', icon: 'codicon:edit', count: 'edited' },
  { type: 'trash', label: 'Trash', icon: 'codicon:trash', count: 'trash' },
];

/** A stable string for comparing and saving collections. */
export function collectionKey(collection: Collection): string {
  switch (collection.type) {
    case 'album':
      return `album:${collection.id}`;
    case 'folder':
      return `folder:${collection.path}`;
    case 'tag':
      return `tag:${collection.name}`;
    case 'place':
      return `place:${collection.country}:${collection.city ?? ''}`;
    default:
      return collection.type;
  }
}

/** Reads a saved collection key back (smart collections and folders only; `null` otherwise). */
export function parseCollectionKey(key: string): Collection | null {
  const smart = SMART.find((entry) => entry.type === key);
  if (smart !== undefined) return { type: smart.type };
  if (key.startsWith('folder:')) return { type: 'folder', path: key.slice(7) };
  if (key.startsWith('tag:')) return { type: 'tag', name: key.slice(4) };
  const album = /^album:(\d+)$/.exec(key);
  if (album?.[1] !== undefined) return { type: 'album', id: Number(album[1]) };
  return null;
}

export function sameCollection(a: Collection, b: Collection): boolean {
  return collectionKey(a) === collectionKey(b);
}

/** "Favorites", "Iceland", "#beach", "Lisbon, Portugal". */
export function collectionTitle(collection: Collection, summary: Summary | null): string {
  switch (collection.type) {
    case 'album':
      return summary?.albums.find((album) => album.id === collection.id)?.name ?? 'Album';
    case 'folder':
      return baseName(collection.path);
    case 'tag':
      return `#${collection.name}`;
    case 'place':
      return collection.city === null
        ? countryName(collection.country)
        : `${collection.city}, ${countryName(collection.country)}`;
    default:
      return SMART.find((entry) => entry.type === collection.type)?.label ?? 'Photos';
  }
}

export function collectionIcon(collection: Collection): CodiconRef {
  switch (collection.type) {
    case 'album':
      return 'codicon:book';
    case 'folder':
      return 'codicon:folder';
    case 'tag':
      return 'codicon:tag';
    case 'place':
      return 'codicon:location';
    default:
      return SMART.find((entry) => entry.type === collection.type)?.icon ?? 'codicon:file-media';
  }
}
