/**
 * Boundary checks for IPC payloads: cheap structural validation so a mismatched Rust/TS pair
 * fails loudly at the edge instead of deep inside a component.
 */
import type {
  Album,
  GalleryContext,
  GroupBy,
  MediaDetails,
  MediaItem,
  Opened,
  Settings,
  SortKey,
  Summary,
  ThumbnailSize,
  TransferOutcome,
  ViewMode,
} from './gallery.types';

/** Thrown when a payload doesn't have the expected shape. */
export class PayloadError extends Error {
  constructor(what: string) {
    super(`Unexpected ${what} from the gallery backend`);
    this.name = 'PayloadError';
  }
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function object(value: unknown, what: string): Json {
  if (!isObject(value)) throw new PayloadError(what);
  return value;
}

function array(value: unknown, what: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new PayloadError(what);
  return value;
}

function isNullableNumber(value: unknown): boolean {
  return value === null || typeof value === 'number';
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.find((candidate) => candidate === value) ?? fallback;
}

function number(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function isMediaItem(value: unknown): value is MediaItem {
  return (
    isObject(value) &&
    typeof value['id'] === 'number' &&
    typeof value['path'] === 'string' &&
    typeof value['name'] === 'string' &&
    (value['kind'] === 'image' || value['kind'] === 'video') &&
    isNullableNumber(value['width']) &&
    isNullableNumber(value['height']) &&
    typeof value['date'] === 'number' &&
    typeof value['size'] === 'number' &&
    typeof value['favorite'] === 'boolean' &&
    typeof value['rating'] === 'number' &&
    typeof value['thumbnail'] === 'boolean' &&
    typeof value['trashed'] === 'boolean'
  );
}

export function parseItem(value: unknown): MediaItem {
  if (!isMediaItem(value)) throw new PayloadError('item');
  return value;
}

export function parseItems(value: unknown): readonly MediaItem[] {
  const items = array(value, 'items');
  if (!items.every(isMediaItem)) throw new PayloadError('item');
  return items;
}

export function parseDetails(value: unknown): MediaDetails {
  const json = object(value, 'details');
  if (!isMediaItem(json) || typeof json['folder'] !== 'string') {
    throw new PayloadError('details');
  }
  return {
    ...(json as unknown as MediaDetails),
    tags: array(json['tags'], 'tags').filter((tag): tag is string => typeof tag === 'string'),
    albums: array(json['albums'], 'albums').filter(
      (album): album is { id: number; name: string } =>
        isObject(album) && typeof album['id'] === 'number' && typeof album['name'] === 'string',
    ),
  };
}

function isAlbum(value: unknown): value is Album {
  return (
    isObject(value) &&
    typeof value['id'] === 'number' &&
    typeof value['name'] === 'string' &&
    typeof value['count'] === 'number' &&
    isNullableNumber(value['cover'])
  );
}

export function parseAlbum(value: unknown): Album {
  if (!isAlbum(value)) throw new PayloadError('album');
  return value;
}

export function parseSummary(value: unknown): Summary {
  const json = object(value, 'summary');
  const albums = array(json['albums'], 'albums');
  if (!albums.every(isAlbum)) throw new PayloadError('album');
  object(json['counts'], 'counts');
  return {
    counts: json['counts'] as Summary['counts'],
    roots: array(json['roots'], 'folders').filter(
      (root): root is string => typeof root === 'string',
    ),
    folders: array(json['folders'], 'folders') as Summary['folders'],
    albums,
    tags: array(json['tags'], 'tags') as Summary['tags'],
    places: array(json['places'], 'places') as Summary['places'],
  };
}

const VIEWS: readonly ViewMode[] = ['timeline', 'grid', 'details'];
const GROUPS: readonly GroupBy[] = ['day', 'month', 'year'];
const SORTS: readonly SortKey[] = ['taken', 'added', 'name', 'size'];
const SIZES: readonly ThumbnailSize[] = ['small', 'medium', 'large'];

/** Settings arrive with their TOML (kebab-case) keys. */
export function parseSettings(value: unknown): Settings {
  const json = object(value, 'settings');
  return {
    view: oneOf(json['view'], VIEWS, 'timeline'),
    groupBy: oneOf(json['group-by'], GROUPS, 'month'),
    sortBy: oneOf(json['sort-by'], SORTS, 'taken'),
    sortDescending: flag(json['sort-descending'], true),
    thumbnailSize: oneOf(json['thumbnail-size'], SIZES, 'medium'),
    showVideos: flag(json['show-videos'], true),
    includeHidden: flag(json['include-hidden'], false),
    confirmTrash: flag(json['confirm-trash'], true),
    slideshowSeconds: number(json['slideshow-seconds'], 4),
    infoPanel: flag(json['info-panel'], true),
    suggestPictures: flag(json['suggest-pictures'], true),
  };
}

export function parseContext(value: unknown): GalleryContext {
  const json = object(value, 'context');
  return {
    settings: parseSettings(json['settings']),
    canRestore: flag(json['canRestore'], false),
    undo: typeof json['undo'] === 'string' ? json['undo'] : null,
    suggestedFolder: typeof json['suggestedFolder'] === 'string' ? json['suggestedFolder'] : null,
    launch: array(json['launch'] ?? [], 'launch paths').filter(
      (path): path is string => typeof path === 'string',
    ),
  };
}

export function parseOpened(value: unknown): Opened {
  const json = object(value, 'opened paths');
  return {
    ids: array(json['ids'], 'ids').filter((id): id is number => typeof id === 'number'),
    folders: array(json['folders'], 'folders').filter(
      (folder): folder is string => typeof folder === 'string',
    ),
  };
}

export function parseTransfer(value: unknown): TransferOutcome {
  const json = object(value, 'transfer');
  return {
    destination: typeof json['destination'] === 'string' ? json['destination'] : null,
    done: number(json['done'], 0),
    failed: array(json['failed'], 'failures') as TransferOutcome['failed'],
  };
}
