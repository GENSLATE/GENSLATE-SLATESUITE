/**
 * Boundary checks for IPC payloads: cheap structural validation so a mismatched Rust/TS pair
 * fails loudly at the edge instead of deep inside a component.
 */
import type {
  Entry,
  ExplorerContext,
  FolderSize,
  Listing,
  Place,
  Properties,
  Settings,
  SortKey,
  TextPreview,
  ViewMode,
  Volume,
} from './explorer.types';

/** Thrown when a payload doesn't have the expected shape. */
export class PayloadError extends Error {
  constructor(what: string) {
    super(`Unexpected ${what} from the explorer backend`);
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

export function isEntry(value: unknown): value is Entry {
  return (
    isObject(value) &&
    typeof value['name'] === 'string' &&
    typeof value['path'] === 'string' &&
    typeof value['isDir'] === 'boolean' &&
    typeof value['kind'] === 'string' &&
    isNullableNumber(value['size']) &&
    isNullableNumber(value['modified']) &&
    typeof value['hidden'] === 'boolean'
  );
}

export function parseEntry(value: unknown): Entry {
  if (!isEntry(value)) throw new PayloadError('entry');
  return value;
}

export function parseEntries(value: unknown): readonly Entry[] {
  const entries = array(value, 'entries');
  if (!entries.every(isEntry)) throw new PayloadError('entry');
  return entries;
}

export function parseListing(value: unknown): Listing {
  const json = object(value, 'listing');
  if (typeof json['path'] !== 'string' || typeof json['name'] !== 'string') {
    throw new PayloadError('listing');
  }
  return {
    path: json['path'],
    name: json['name'],
    parent: typeof json['parent'] === 'string' ? json['parent'] : null,
    entries: parseEntries(json['entries']),
    hiddenCount: typeof json['hiddenCount'] === 'number' ? json['hiddenCount'] : 0,
    skipped: typeof json['skipped'] === 'number' ? json['skipped'] : 0,
  };
}

function isPlace(value: unknown): value is Place {
  return (
    isObject(value) &&
    typeof value['id'] === 'string' &&
    typeof value['label'] === 'string' &&
    typeof value['path'] === 'string'
  );
}

function isVolume(value: unknown): value is Volume {
  return (
    isObject(value) &&
    typeof value['label'] === 'string' &&
    typeof value['path'] === 'string' &&
    typeof value['totalBytes'] === 'number' &&
    typeof value['availableBytes'] === 'number'
  );
}

export function parseVolumes(value: unknown): readonly Volume[] {
  const volumes = array(value, 'volumes');
  if (!volumes.every(isVolume)) throw new PayloadError('volume');
  return volumes;
}

const VIEWS: readonly ViewMode[] = ['details', 'icons', 'tiles'];
const SORTS: readonly SortKey[] = ['name', 'modified', 'kind', 'size'];

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** `[explorer]` arrives with its config.toml (kebab-case) keys. */
export function parseSettings(value: unknown): Settings {
  const json = object(value, 'settings');
  return {
    view: oneOf(json['view'], VIEWS, 'details'),
    sortBy: oneOf(json['sort-by'], SORTS, 'name'),
    sortDescending: flag(json['sort-descending'], false),
    foldersFirst: flag(json['folders-first'], true),
    showHidden: flag(json['show-hidden'], false),
    confirmTrash: flag(json['confirm-trash'], false),
    startFolder: typeof json['start-folder'] === 'string' ? json['start-folder'] : 'home',
    restoreTabs: flag(json['restore-tabs'], true),
    previewPane: flag(json['preview-pane'], true),
  };
}

export function parseContext(value: unknown): ExplorerContext {
  const json = object(value, 'context');
  const places = array(json['places'], 'places');
  if (!places.every(isPlace)) throw new PayloadError('place');
  if (typeof json['startFolder'] !== 'string') throw new PayloadError('start folder');
  return {
    home: typeof json['home'] === 'string' ? json['home'] : null,
    startFolder: json['startFolder'],
    places,
    volumes: parseVolumes(json['volumes']),
    settings: parseSettings(json['settings']),
    canRestoreFromTrash: flag(json['canRestoreFromTrash'], false),
    canOpenWith: flag(json['canOpenWith'], false),
    undo: typeof json['undo'] === 'string' ? json['undo'] : null,
  };
}

export function parseTextPreview(value: unknown): TextPreview {
  const json = object(value, 'text preview');
  if (typeof json['text'] !== 'string') throw new PayloadError('text preview');
  return {
    text: json['text'],
    truncated: flag(json['truncated'], false),
    binary: flag(json['binary'], false),
  };
}

export function parseFolderSize(value: unknown): FolderSize {
  const json = object(value, 'folder size');
  if (typeof json['bytes'] !== 'number') throw new PayloadError('folder size');
  return {
    bytes: json['bytes'],
    files: typeof json['files'] === 'number' ? json['files'] : 0,
    folders: typeof json['folders'] === 'number' ? json['folders'] : 0,
    cancelled: flag(json['cancelled'], false),
  };
}

export function parseProperties(value: unknown): Properties {
  const json = object(value, 'properties');
  return {
    entry: parseEntry(json['entry']),
    accessed: typeof json['accessed'] === 'number' ? json['accessed'] : null,
    permissions: typeof json['permissions'] === 'string' ? json['permissions'] : '',
    linkTarget: typeof json['linkTarget'] === 'string' ? json['linkTarget'] : null,
    children: typeof json['children'] === 'number' ? json['children'] : null,
  };
}

export function parseStrings(value: unknown, what: string): readonly string[] {
  const items = array(value, what);
  if (!items.every((item) => typeof item === 'string')) throw new PayloadError(what);
  return items;
}
