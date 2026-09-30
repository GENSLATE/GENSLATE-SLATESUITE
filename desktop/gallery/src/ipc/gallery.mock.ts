/**
 * The in-memory backend used in a plain browser: a sample library that supports every
 * command (with simulated scans, duplicate searches and exports), so the UI can be built,
 * tested and screenshot anywhere. Add `?empty` to the URL to start with no folders.
 */
import { baseName, isInside, joinPath, parentOf } from '../model/path.util';
import type { GalleryBackend } from './gallery.client';
import { MOCK_ROOT, type MockSeed, mockSeeds } from './gallery.mock-data';
import { drawScene, sceneUrl } from './gallery.mock-scenes';
import type {
  Album,
  BackendError,
  Collection,
  DuplicateGroup,
  FolderNode,
  GalleryEvents,
  MediaDetails,
  MediaItem,
  PlaceCount,
  Query,
  Settings,
  Summary,
} from './gallery.types';

const DAY = 86_400_000;
const RECENT_DAYS = 30;

interface Media {
  readonly id: number;
  path: string;
  name: string;
  folder: string;
  readonly seed: MockSeed;
  favorite: boolean;
  rating: number;
  readonly tags: Set<string>;
  readonly albums: Set<number>;
  trashedAt: number | null;
  editedAt: number | null;
  readonly addedAt: number;
}

type UndoRecord =
  | { type: 'relocate'; items: readonly (readonly [number, string, string])[] }
  | { type: 'trash'; ids: readonly number[] };

function fail(kind: string, message: string): BackendError {
  return { kind, message };
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function sameCollection(item: Media, collection: Collection, now: number): boolean {
  if (collection.type === 'trash') return item.trashedAt !== null;
  if (item.trashedAt !== null) return false;
  switch (collection.type) {
    case 'all':
      return true;
    case 'favorites':
      return item.favorite;
    case 'videos':
      return item.seed.kind === 'video';
    case 'screenshots':
      return item.seed.screenshot;
    case 'recent':
      return item.addedAt >= now - RECENT_DAYS * DAY;
    case 'edited':
      return item.editedAt !== null;
    case 'album':
      return item.albums.has(collection.id);
    case 'folder':
      return item.folder === collection.path || isInside(item.path, collection.path);
    case 'tag':
      return [...item.tags].some((tag) => tag.toLowerCase() === collection.name.toLowerCase());
    case 'place':
      return (
        item.seed.place?.country === collection.country &&
        (collection.city === null || item.seed.place.city === collection.city)
      );
  }
}

/** A fresh in-memory backend (each call starts from the sample library). */
export function createMockBackend(now = Date.now()): GalleryBackend {
  const empty =
    typeof location !== 'undefined' && new URLSearchParams(location.search).has('empty');
  const listeners = new Set<GalleryEvents>();
  const media = new Map<number, Media>();
  const albums = new Map<number, { id: number; name: string; createdAt: number }>();
  const urls = new Map<number, string>();
  const undoStack: UndoRecord[] = [];
  const cancelled = new Set<string>();
  let roots: string[] = empty ? [] : [MOCK_ROOT];
  let nextId = 1;
  let nextAlbum = 1;
  let settings: Settings = {
    view: 'timeline',
    groupBy: 'month',
    sortBy: 'taken',
    sortDescending: true,
    thumbnailSize: 'medium',
    showVideos: true,
    includeHidden: false,
    confirmTrash: true,
    slideshowSeconds: 4,
    infoPanel: true,
    suggestPictures: true,
  };

  const albumId = (name: string) => {
    const found = [...albums.values()].find((album) => album.name === name);
    if (found !== undefined) return found.id;
    const id = nextAlbum++;
    albums.set(id, { id, name, createdAt: now - 20 * DAY });
    return id;
  };
  const add = (seed: MockSeed, addedAt: number): Media => {
    const id = nextId++;
    const item: Media = {
      id,
      path: joinPath(seed.folder, seed.name),
      name: seed.name,
      folder: seed.folder,
      seed,
      favorite: seed.favorite,
      rating: seed.rating,
      tags: new Set(seed.tags),
      albums: new Set(seed.albums.map(albumId)),
      trashedAt: null,
      editedAt: null,
      addedAt,
    };
    media.set(id, item);
    return item;
  };
  const load = () => {
    for (const seed of mockSeeds(now)) add(seed, Math.max(seed.date, now - 400 * DAY));
    // Two exact copies imported twice, so the duplicate finder has something to find.
    for (const id of [5, 40]) {
      const original = media.get(id);
      if (original !== undefined) {
        add({ ...original.seed, folder: `${MOCK_ROOT}/Imported`, name: original.name }, now - DAY);
      }
    }
  };
  if (!empty) load();

  const emit = (send: (events: GalleryEvents) => void) => {
    for (const listener of listeners) send(listener);
  };
  const changed = () => emit((events) => events.libraryChanged());
  const pushUndo = (record: UndoRecord) => {
    undoStack.push(record);
    emit((events) => events.undo(labelOf(record)));
  };
  const labelOf = (record: UndoRecord) =>
    record.type === 'trash' ? 'Move to Trash' : record.items.length === 1 ? 'Rename' : 'Move';

  const get = (id: number): Media => {
    const item = media.get(id);
    if (item === undefined) throw fail('unknown-media', `no photo or video with id ${id}`);
    return item;
  };
  const toItem = (item: Media): MediaItem => ({
    id: item.id,
    path: item.path,
    name: item.name,
    kind: item.seed.kind,
    width: item.seed.width,
    height: item.seed.height,
    date: item.seed.date,
    dated: !item.seed.screenshot,
    size: item.seed.size,
    favorite: item.favorite,
    rating: item.rating,
    durationMs: item.seed.durationMs,
    thumbnail: true,
    preview: 'original',
    trashed: item.trashedAt !== null,
  });
  const toDetails = (item: Media): MediaDetails => ({
    ...toItem(item),
    folder: item.folder,
    modifiedAt: item.seed.date,
    addedAt: item.addedAt,
    takenAt: item.seed.screenshot ? null : item.seed.date,
    orientation: 1,
    camera: item.seed.camera,
    lens: item.seed.lens,
    fNumber: item.seed.fNumber,
    exposure: item.seed.exposure,
    iso: item.seed.iso,
    focalMm: item.seed.focalMm,
    flash: item.seed.camera === null ? null : false,
    latitude: item.seed.place?.latitude ?? null,
    longitude: item.seed.place?.longitude ?? null,
    place:
      item.seed.place === null
        ? null
        : {
            city: item.seed.place.city,
            region: item.seed.place.region,
            country: item.seed.place.country,
          },
    screenshot: item.seed.screenshot,
    editedAt: item.editedAt,
    tags: [...item.tags].sort(),
    albums: [...item.albums]
      .map((id) => albums.get(id))
      .filter((album) => album !== undefined)
      .map((album) => ({ id: album.id, name: album.name })),
  });

  const matches = (item: Media, search: string): boolean => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    const text = [
      item.name,
      item.folder,
      item.seed.camera ?? '',
      item.seed.place?.city ?? '',
      item.seed.place?.country ?? '',
      ...item.tags,
      ...[...item.albums].map((id) => albums.get(id)?.name ?? ''),
      new Date(item.seed.date).toLocaleString(undefined, { month: 'long', year: 'numeric' }),
    ]
      .join(' ')
      .toLowerCase();
    return words.every((word) => {
      const tag = word.startsWith('tag:')
        ? word.slice(4)
        : word.startsWith('#')
          ? word.slice(1)
          : null;
      return tag === null
        ? text.includes(word)
        : [...item.tags].some((t) => t.toLowerCase() === tag);
    });
  };

  const query = (request: Query): readonly MediaItem[] => {
    const list = [...media.values()].filter(
      (item) =>
        sameCollection(item, request.collection, now) &&
        (request.search.trim() === '' || matches(item, request.search)) &&
        (!request.favoritesOnly || item.favorite) &&
        item.rating >= request.minRating &&
        (request.kind === null || item.seed.kind === request.kind) &&
        (request.includeVideos ||
          request.collection.type === 'videos' ||
          item.seed.kind === 'image') &&
        (request.from === null || item.seed.date >= request.from) &&
        (request.to === null || item.seed.date <= request.to),
    );
    const key = (item: Media): number | string =>
      request.sort === 'name'
        ? item.name.toLowerCase()
        : request.sort === 'size'
          ? item.seed.size
          : request.sort === 'added'
            ? item.addedAt
            : item.seed.date;
    list.sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      const order = ka < kb ? -1 : ka > kb ? 1 : a.id - b.id;
      return request.descending ? -order : order;
    });
    return list.map(toItem);
  };

  const folderTree = (): readonly FolderNode[] => {
    const live = [...media.values()].filter((item) => item.trashedAt === null);
    const build = (path: string): FolderNode => {
      const inside = live.filter((item) => item.folder === path || isInside(item.folder, path));
      const children = [
        ...new Set(
          inside
            .map((item) => item.folder)
            .filter((folder) => folder !== path)
            .map((folder) => {
              const rest = folder.slice(path.length + 1).split('/')[0] ?? '';
              return joinPath(path, rest);
            }),
        ),
      ]
        .sort()
        .map(build);
      return { path, name: baseName(path), count: inside.length, children };
    };
    return roots.map(build);
  };

  const summary = (): Summary => {
    const live = [...media.values()].filter((item) => item.trashedAt === null);
    const tagCounts = new Map<string, number>();
    const placeCounts = new Map<string, PlaceCount>();
    for (const item of live) {
      for (const tag of item.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      const place = item.seed.place;
      if (place !== null) {
        const key = `${place.country}/${place.city}`;
        const current = placeCounts.get(key);
        placeCounts.set(key, {
          city: place.city,
          region: place.region,
          country: place.country,
          count: (current?.count ?? 0) + 1,
          cover: current?.cover ?? item.id,
        });
      }
    }
    const albumList: Album[] = [...albums.values()].map((album) => {
      const members = live
        .filter((item) => item.albums.has(album.id))
        .sort((a, b) => b.seed.date - a.seed.date);
      return { ...album, count: members.length, cover: members[0]?.id ?? null };
    });
    return {
      counts: {
        all: live.length,
        photos: live.filter((item) => item.seed.kind === 'image').length,
        videos: live.filter((item) => item.seed.kind === 'video').length,
        favorites: live.filter((item) => item.favorite).length,
        screenshots: live.filter((item) => item.seed.screenshot).length,
        recent: live.filter((item) => item.addedAt >= now - RECENT_DAYS * DAY).length,
        edited: live.filter((item) => item.editedAt !== null).length,
        trash: media.size - live.length,
        bytes: live.reduce((sum, item) => sum + item.seed.size, 0),
      },
      roots,
      folders: folderTree(),
      albums: albumList.sort((a, b) => a.name.localeCompare(b.name)),
      tags: [...tagCounts]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      places: [...placeCounts.values()].sort((a, b) => b.count - a.count),
    };
  };

  const validateName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed === '' || /[<>:"/\\|?*]/.test(trimmed) || trimmed.endsWith('.')) {
      throw fail('invalid-argument', 'a name can’t contain < > : " / \\ | ? * or end with a dot');
    }
    return trimmed;
  };
  const freeName = (folder: string, name: string) => {
    const taken = (candidate: string) =>
      [...media.values()].some((item) => item.path === joinPath(folder, candidate));
    if (!taken(name)) return name;
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : '';
    for (let number = 2; ; number += 1) {
      const candidate = `${stem} ${number}${extension}`;
      if (!taken(candidate)) return candidate;
    }
  };
  const relocate = (item: Media, to: string) => {
    item.path = to;
    item.name = baseName(to);
    item.folder = parentOf(to) ?? item.folder;
  };

  const simulateScan = async (folder: string) => {
    for (let read = 0; read <= 4; read += 1) {
      await delay(120);
      emit((events) => events.scanProgress({ folder, found: 0, toRead: 4, read }));
    }
    emit((events) => events.scanDone({ added: 0, updated: 0, removed: 0, errors: [] }));
  };

  const duplicates = (): DuplicateGroup[] => {
    const live = [...media.values()].filter((item) => item.trashedAt === null);
    const groups: DuplicateGroup[] = [];
    const byScene = new Map<number, Media[]>();
    for (const item of live) {
      const list = byScene.get(item.seed.scene.seed) ?? [];
      list.push(item);
      byScene.set(item.seed.scene.seed, list);
    }
    for (const list of byScene.values()) {
      if (list.length > 1) {
        groups.push({
          likeness: 'exact',
          ids: list.map((item) => item.id),
          reclaimable: list.slice(1).reduce((sum, item) => sum + item.seed.size, 0),
        });
      }
    }
    // Bursts: shots of the same scene taken minutes apart look alike.
    const images = live
      .filter((item) => item.seed.kind === 'image' && !item.seed.screenshot)
      .sort((a, b) => a.seed.date - b.seed.date);
    for (let index = 1; index < images.length && groups.length < 5; index += 1) {
      const a = images[index - 1];
      const b = images[index];
      if (
        a !== undefined &&
        b !== undefined &&
        a.seed.scene.kind === b.seed.scene.kind &&
        a.seed.scene.time === b.seed.scene.time &&
        a.seed.scene.seed !== b.seed.scene.seed
      ) {
        groups.push({ likeness: 'similar', ids: [a.id, b.id], reclaimable: b.seed.size });
        index += 1;
      }
    }
    return groups;
  };

  const urlOf = (item: MediaItem) => {
    const cached = urls.get(item.id);
    if (cached !== undefined) return cached;
    const found = media.get(item.id);
    if (found === undefined) return '';
    const { kind, time, seed } = found.seed.scene;
    const url = sceneUrl(drawScene(seed, kind, time, found.seed.width, found.seed.height));
    urls.set(item.id, url);
    return url;
  };

  const backend: GalleryBackend = {
    context: async () => {
      await delay(80);
      return {
        settings,
        canRestore: true,
        undo: null,
        suggestedFolder: roots.length === 0 ? MOCK_ROOT : null,
        launch: [],
      };
    },
    summary: async () => summary(),
    query: async (request) => query(request),
    details: async (id) => toDetails(get(id)),
    addFolder: async () => backend.addFolderPath(`${MOCK_ROOT.replace('/Pictures', '')}/Downloads`),
    addFolderPath: async (path) => {
      const holder = roots.find((root) => root === path || isInside(path, root));
      if (holder !== undefined) return holder;
      roots = [...roots.filter((root) => !isInside(root, path)), path];
      if (path === MOCK_ROOT && media.size === 0) load();
      changed();
      void simulateScan(path);
      return path;
    },
    removeFolder: async (path) => {
      roots = roots.filter((root) => root !== path);
      let removed = 0;
      for (const item of [...media.values()]) {
        if (isInside(item.path, path)) {
          media.delete(item.id);
          removed += 1;
        }
      }
      changed();
      return removed;
    },
    rescan: async () => {
      for (const root of roots) void simulateScan(root);
    },
    openPaths: async () => ({ ids: [], folders: [] }),
    setFavorite: async (ids, favorite) => {
      for (const id of ids) get(id).favorite = favorite;
      changed();
    },
    setRating: async (ids, rating) => {
      if (rating > 5) throw fail('invalid-argument', 'ratings go from 0 to 5');
      for (const id of ids) get(id).rating = rating;
      changed();
    },
    addTag: async (ids, name) => {
      const clean = name.trim().replace(/^#/, '');
      if (clean === '') throw fail('invalid-argument', 'a tag needs a name');
      const existing = summary().tags.find((tag) => tag.name.toLowerCase() === clean.toLowerCase());
      const tag = existing?.name ?? clean;
      for (const id of ids) get(id).tags.add(tag);
      changed();
      return tag;
    },
    removeTag: async (ids, name) => {
      for (const id of ids) get(id).tags.delete(name);
      changed();
    },
    createAlbum: async (name, ids) => {
      const clean = name.trim();
      if (clean === '') throw fail('invalid-argument', 'an album needs a name');
      if ([...albums.values()].some((album) => album.name.toLowerCase() === clean.toLowerCase())) {
        throw fail('already-exists', `“${clean}” already exists`);
      }
      const id = albumId(clean);
      for (const item of ids) get(item).albums.add(id);
      changed();
      const created = summary().albums.find((album) => album.id === id);
      if (created === undefined) throw fail('unknown-album', `no album with id ${id}`);
      return created;
    },
    renameAlbum: async (id, name) => {
      const album = albums.get(id);
      if (album === undefined) throw fail('unknown-album', `no album with id ${id}`);
      album.name = name.trim();
      changed();
    },
    deleteAlbum: async (id) => {
      albums.delete(id);
      for (const item of media.values()) item.albums.delete(id);
      changed();
    },
    addToAlbum: async (album, ids) => {
      let added = 0;
      for (const id of ids) {
        const item = get(id);
        if (!item.albums.has(album)) added += 1;
        item.albums.add(album);
      }
      changed();
      return added;
    },
    removeFromAlbum: async (album, ids) => {
      for (const id of ids) get(id).albums.delete(album);
      changed();
    },
    setSetting: async (key, value) => {
      settings = { ...settings, [key]: value };
      return settings;
    },
    rename: async (id, newName) => {
      const item = get(id);
      const name = validateName(newName);
      const to = joinPath(item.folder, name);
      if (to !== item.path && [...media.values()].some((other) => other.path === to)) {
        throw fail('already-exists', `“${name}” already exists`);
      }
      const from = item.path;
      relocate(item, to);
      pushUndo({ type: 'relocate', items: [[id, from, to]] });
      changed();
      return toItem(item);
    },
    move: async (ids, destination) => {
      const folder = destination ?? `${MOCK_ROOT}/Sorted`;
      const moved: (readonly [number, string, string])[] = [];
      for (const id of ids) {
        const item = get(id);
        if (item.folder === folder) continue;
        const to = joinPath(folder, freeName(folder, item.name));
        moved.push([id, item.path, to]);
        relocate(item, to);
      }
      if (moved.length > 0) pushUndo({ type: 'relocate', items: moved });
      changed();
      return { destination: folder, done: moved.length, failed: [] };
    },
    copy: async (ids, destination) => {
      const folder = destination ?? `${MOCK_ROOT}/Copies`;
      for (const id of ids) {
        const item = get(id);
        add({ ...item.seed, folder, name: freeName(folder, item.name) }, Date.now());
      }
      changed();
      return { destination: folder, done: ids.length, failed: [] };
    },
    trash: async (ids) => {
      for (const id of ids) get(id).trashedAt = Date.now();
      pushUndo({ type: 'trash', ids });
      changed();
      return ids.length;
    },
    restore: async (ids) => {
      for (const id of ids) get(id).trashedAt = null;
      changed();
      return ids.length;
    },
    forget: async (ids) => {
      for (const id of ids) media.delete(id);
      changed();
    },
    undo: async () => {
      const record = undoStack.pop();
      if (record === undefined) return null;
      if (record.type === 'trash') {
        for (const id of record.ids) {
          const item = media.get(id);
          if (item !== undefined) item.trashedAt = null;
        }
      } else {
        for (const [id, from] of [...record.items].reverse()) {
          const item = media.get(id);
          if (item !== undefined) relocate(item, from);
        }
      }
      const next = undoStack.at(-1);
      const label = next === undefined ? null : labelOf(next);
      emit((events) => events.undo(label));
      changed();
      return label;
    },
    open: async () => undefined,
    reveal: async () => undefined,
    saveEdit: async (id) => {
      const item = get(id);
      const dot = item.name.lastIndexOf('.');
      const stem = dot > 0 ? item.name.slice(0, dot) : item.name;
      const copy = add(
        {
          ...item.seed,
          name: freeName(item.folder, `${stem} (edited)${dot > 0 ? item.name.slice(dot) : ''}`),
        },
        Date.now(),
      );
      copy.editedAt = Date.now();
      changed();
      return toItem(copy);
    },
    findDuplicates: async (id) => {
      cancelled.delete(id);
      const total = 24;
      void (async () => {
        for (let done = 0; done <= total; done += 4) {
          await delay(90);
          if (cancelled.has(id)) {
            emit((events) => events.duplicatesDone({ id, groups: null, error: null }));
            return;
          }
          emit((events) => events.taskProgress({ id, done, total }));
        }
        emit((events) => events.duplicatesDone({ id, groups: duplicates(), error: null }));
      })();
    },
    exportMedia: async (id, ids, _options, destination) => {
      const folder = destination ?? `${MOCK_ROOT.replace('/Pictures', '')}/Desktop/Export`;
      cancelled.delete(id);
      void (async () => {
        for (let done = 0; done <= ids.length; done += 1) {
          await delay(60);
          if (cancelled.has(id)) {
            emit((events) =>
              events.exportDone({
                id,
                destination: folder,
                written: done,
                failed: [],
                cancelled: true,
                error: null,
              }),
            );
            return;
          }
          emit((events) => events.taskProgress({ id, done, total: ids.length }));
        }
        emit((events) =>
          events.exportDone({
            id,
            destination: folder,
            written: ids.length,
            failed: [],
            cancelled: false,
            error: null,
          }),
        );
      })();
      return folder;
    },
    cancelTask: async (id) => {
      cancelled.add(id);
    },
    thumbUrl: (item) => urlOf(item),
    mediaUrl: (item) => urlOf(item),
    videoPoster: (item) => urlOf(item),
    subscribe: async (events) => {
      listeners.add(events);
      return () => listeners.delete(events);
    },
  };
  return backend;
}
