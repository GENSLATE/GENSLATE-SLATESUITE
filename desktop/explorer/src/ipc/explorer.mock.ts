/**
 * The in-memory backend used in a plain browser: a sample home folder that supports every
 * command (with simulated progress), so the UI can be built, tested and screenshot anywhere.
 */
import { baseName, joinPath, parentOf } from '../model/path.util';
import type { ExplorerBackend } from './explorer.client';
import { MOCK_HOME, MOCK_SEEDS, MOCK_USB, mockTime } from './explorer.mock-data';
import type {
  BackendError,
  Entry,
  ExplorerEvents,
  FileKind,
  Place,
  Settings,
  TextPreview,
} from './explorer.types';

interface Node {
  readonly isDir: boolean;
  size: number;
  modified: number;
  readonly created: number;
  text: string | null;
}

type UndoRecord =
  | { type: 'rename'; from: string; to: string }
  | { type: 'move'; items: readonly (readonly [string, string])[] }
  | { type: 'create'; paths: readonly string[] }
  | { type: 'trash'; items: readonly (readonly [string, Map<string, Node>])[] };

const UNDO_LABELS = { rename: 'Rename', move: 'Move', create: 'New item', trash: 'Move to Trash' };

const EXTENSION_KINDS: Readonly<Record<string, FileKind>> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  svg: 'image',
  gif: 'image',
  webp: 'image',
  mp4: 'video',
  mov: 'video',
  mkv: 'video',
  mp3: 'audio',
  flac: 'audio',
  wav: 'audio',
  txt: 'text',
  log: 'text',
  md: 'markdown',
  rs: 'code',
  ts: 'code',
  html: 'code',
  css: 'code',
  json: 'data',
  toml: 'data',
  yaml: 'data',
  csv: 'data',
  pdf: 'pdf',
  docx: 'document',
  xlsx: 'spreadsheet',
  pptx: 'presentation',
  zip: 'archive',
  iso: 'disk-image',
  exe: 'executable',
};

function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf('.');
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : null;
}

function fail(kind: string, message: string): BackendError {
  return { kind, message };
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A fresh in-memory backend (each call starts from the sample tree). */
export function createMockBackend(now = Date.now()): ExplorerBackend {
  const nodes = new Map<string, Node>();
  const listeners = new Set<ExplorerEvents>();
  const undoStack: UndoRecord[] = [];
  const cancelled = new Set<string>();
  let settings: Settings = {
    view: 'details',
    sortBy: 'name',
    sortDescending: false,
    foldersFirst: true,
    showHidden: false,
    confirmTrash: false,
    startFolder: 'home',
    restoreTabs: false,
    previewPane: true,
  };

  const addDir = (path: string, age: number) => {
    const time = mockTime(now, age);
    nodes.set(path, { isDir: true, size: 0, modified: time, created: time, text: null });
  };
  for (const root of ['/', '/home', '/media', MOCK_HOME, MOCK_USB]) addDir(root, 60);
  for (const seed of MOCK_SEEDS) {
    const time = mockTime(now, seed.age ?? 10);
    let parent = parentOf(seed.path);
    while (parent !== null && !nodes.has(parent)) {
      addDir(parent, seed.age ?? 10);
      parent = parentOf(parent);
    }
    nodes.set(seed.path, {
      isDir: seed.dir === true,
      size: seed.text === undefined ? (seed.size ?? 0) : new TextEncoder().encode(seed.text).length,
      modified: time,
      created: time - 30 * 86_400_000,
      text: seed.text ?? null,
    });
  }

  const children = (dir: string) =>
    [...nodes.keys()].filter((path) => path !== dir && parentOf(path) === dir);
  const subtree = (path: string) =>
    [...nodes.keys()].filter((candidate) => candidate === path || candidate.startsWith(`${path}/`));
  const emit = (send: (events: ExplorerEvents) => void) => {
    for (const listener of listeners) send(listener);
  };
  const changed = (...folders: (string | null)[]) => {
    const list = folders.filter((folder): folder is string => folder !== null);
    emit((events) => events.changed(list));
  };
  const pushUndo = (record: UndoRecord) => {
    undoStack.push(record);
    emit((events) => events.undo(UNDO_LABELS[record.type]));
  };

  const toEntry = (path: string): Entry => {
    const node = nodes.get(path);
    if (node === undefined) throw fail('not-found', `${path} does not exist`);
    const name = baseName(path);
    const extension = node.isDir ? null : extensionOf(name);
    return {
      name,
      path,
      isDir: node.isDir,
      kind: node.isDir
        ? 'folder'
        : ((extension === null ? undefined : EXTENSION_KINDS[extension]) ?? 'other'),
      extension,
      size: node.isDir ? null : node.size,
      modified: node.modified,
      created: node.created,
      hidden: name.startsWith('.'),
      readonly: false,
      symlink: false,
    };
  };

  const requireDir = (path: string) => {
    const node = nodes.get(path);
    if (node === undefined) throw fail('not-found', `${path} does not exist`);
    if (!node.isDir) throw fail('not-a-folder', `${path} is not a folder`);
  };

  const validName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed === '') throw fail('invalid-name', 'A name can’t be empty.');
    if (/[<>:"/\\|?*]/.test(trimmed))
      throw fail('invalid-name', 'A name can’t contain < > : " / \\ | ? *');
    return trimmed;
  };

  const freeName = (dir: string, name: string) => {
    if (!nodes.has(joinPath(dir, name))) return joinPath(dir, name);
    const ext = extensionOf(name);
    const stem = ext === null ? name : name.slice(0, -(ext.length + 1));
    for (let index = 2; ; index += 1) {
      const candidate = joinPath(dir, `${stem} (${index})${ext === null ? '' : `.${ext}`}`);
      if (!nodes.has(candidate)) return candidate;
    }
  };

  const moveTree = (from: string, to: string) => {
    for (const path of subtree(from)) {
      const node = nodes.get(path);
      if (node === undefined) continue;
      nodes.delete(path);
      nodes.set(to + path.slice(from.length), node);
    }
  };

  const copyTree = (from: string, to: string) => {
    for (const path of subtree(from)) {
      const node = nodes.get(path);
      if (node !== undefined) nodes.set(to + path.slice(from.length), { ...node });
    }
  };

  const create = (parent: string, name: string, isDir: boolean): Entry => {
    requireDir(parent);
    const path = freeName(parent, validName(name));
    nodes.set(path, {
      isDir,
      size: 0,
      modified: Date.now(),
      created: Date.now(),
      text: isDir ? null : '',
    });
    pushUndo({ type: 'create', paths: [path] });
    changed(parent);
    return toEntry(path);
  };

  const places: Place[] = [
    { id: 'home', label: 'Home', path: MOCK_HOME },
    { id: 'desktop', label: 'Desktop', path: `${MOCK_HOME}/Desktop` },
    { id: 'documents', label: 'Documents', path: `${MOCK_HOME}/Documents` },
    { id: 'downloads', label: 'Downloads', path: `${MOCK_HOME}/Downloads` },
    { id: 'pictures', label: 'Pictures', path: `${MOCK_HOME}/Pictures` },
    { id: 'music', label: 'Music', path: `${MOCK_HOME}/Music` },
    { id: 'videos', label: 'Videos', path: `${MOCK_HOME}/Videos` },
  ];
  const volumes = [
    {
      label: 'System',
      name: 'System',
      path: '/',
      totalBytes: 512e9,
      availableBytes: 187e9,
      removable: false,
    },
    {
      label: 'GENSLATE USB',
      name: 'GENSLATE',
      path: MOCK_USB,
      totalBytes: 64e9,
      availableBytes: 41e9,
      removable: true,
    },
  ];

  return {
    context: async () => ({
      home: MOCK_HOME,
      startFolder: `${MOCK_HOME}/Documents`,
      places,
      volumes,
      settings,
      canRestoreFromTrash: true,
      canOpenWith: false,
      undo: null,
    }),
    volumes: async () => volumes,
    listDir: async (path, showHidden) => {
      requireDir(path);
      const all = children(path).map(toEntry);
      const entries = showHidden ? all : all.filter((entry) => !entry.hidden);
      return {
        path,
        name: baseName(path),
        parent: parentOf(path),
        entries,
        hiddenCount: all.length - entries.length,
        skipped: 0,
      };
    },
    createFolder: async (parent, name) => create(parent, name, true),
    createFile: async (parent, name) => create(parent, name, false),
    rename: async (path, newName) => {
      const parent = parentOf(path);
      if (parent === null || !nodes.has(path)) throw fail('not-found', `${path} does not exist`);
      const target = joinPath(parent, validName(newName));
      if (target === path) return toEntry(path);
      if (nodes.has(target))
        throw fail('already-exists', `“${baseName(target)}” already exists here`);
      moveTree(path, target);
      pushUndo({ type: 'rename', from: path, to: target });
      changed(parent);
      return toEntry(target);
    },
    trash: async (paths) => {
      const items = paths.map((path) => {
        const removed = new Map<string, Node>();
        for (const item of subtree(path)) {
          const node = nodes.get(item);
          if (node !== undefined) removed.set(item, node);
          nodes.delete(item);
        }
        return [path, removed] as const;
      });
      pushUndo({ type: 'trash', items });
      changed(...paths.map(parentOf));
    },
    deletePermanently: async (paths) => {
      for (const path of paths) for (const item of subtree(path)) nodes.delete(item);
      changed(...paths.map(parentOf));
    },
    undo: async () => {
      const record = undoStack.pop();
      const next = undoStack.at(-1);
      emit((events) => events.undo(next === undefined ? null : UNDO_LABELS[next.type]));
      if (record === undefined) return null;
      if (record.type === 'rename') moveTree(record.to, record.from);
      if (record.type === 'move') for (const [from, to] of record.items) moveTree(to, from);
      if (record.type === 'create')
        for (const path of record.paths) for (const item of subtree(path)) nodes.delete(item);
      if (record.type === 'trash')
        for (const [, removed] of record.items)
          for (const [path, node] of removed) nodes.set(path, node);
      changed(...[...nodes.keys()].filter((path) => nodes.get(path)?.isDir === true));
      return UNDO_LABELS[record.type];
    },
    readText: async (path): Promise<TextPreview> => {
      const node = nodes.get(path);
      if (node === undefined) throw fail('not-found', `${path} does not exist`);
      return node.text === null
        ? { text: '', truncated: false, binary: true }
        : { text: node.text, truncated: false, binary: false };
    },
    properties: async (path) => ({
      entry: toEntry(path),
      accessed: Date.now(),
      permissions: 'rw-r--r--',
      linkTarget: null,
      children: nodes.get(path)?.isDir === true ? children(path).length : null,
    }),
    openPath: async () => undefined,
    openWith: async () => {
      throw fail('unsupported', '“Open with” is only available in the desktop app on Windows.');
    },
    reveal: async () => undefined,
    watch: async () => undefined,
    setSetting: async (key, value) => {
      settings = { ...settings, [key]: value };
      return settings;
    },
    findConflicts: async (sources, destination) =>
      sources
        .filter((source) => parentOf(source) !== destination)
        .map(baseName)
        .filter((name) => nodes.has(joinPath(destination, name))),
    startTransfer: async (id, mode, sources, destination, policy) => {
      requireDir(destination);
      const totalBytes =
        sources.reduce((sum, source) => sum + (nodes.get(source)?.size ?? 0), 0) || 1;
      for (let step = 1; step <= 8; step += 1) {
        await delay(90);
        if (cancelled.delete(id)) {
          emit((events) =>
            events.taskDone({
              id,
              mode,
              done: 0,
              skipped: 0,
              cancelled: true,
              targets: [],
              error: null,
            }),
          );
          return;
        }
        const progress = {
          doneBytes: Math.round((totalBytes * step) / 8),
          totalBytes,
          doneItems: Math.round((sources.length * step) / 8),
          totalItems: sources.length,
          current: baseName(sources[Math.min(sources.length - 1, step % sources.length)] ?? ''),
        };
        emit((events) => events.progress(id, progress));
      }
      const done: [string, string][] = [];
      let skipped = 0;
      for (const source of sources) {
        const inPlace = parentOf(source) === destination;
        if (inPlace && mode === 'move') {
          skipped += 1;
          continue;
        }
        let target = joinPath(destination, baseName(source));
        if (nodes.has(target)) {
          if (policy === 'skip' && !inPlace) {
            skipped += 1;
            continue;
          }
          if (policy === 'replace' && !inPlace)
            for (const item of subtree(target)) nodes.delete(item);
          else target = freeName(destination, baseName(source));
        }
        if (mode === 'copy') copyTree(source, target);
        else moveTree(source, target);
        done.push([source, target]);
      }
      if (done.length > 0) {
        pushUndo(
          mode === 'copy'
            ? { type: 'create', paths: done.map(([, to]) => to) }
            : { type: 'move', items: done },
        );
      }
      changed(destination, ...sources.map(parentOf));
      emit((events) =>
        events.taskDone({
          id,
          mode,
          done: done.length,
          skipped,
          cancelled: false,
          targets: done.map(([, to]) => to),
          error: null,
        }),
      );
    },
    startSearch: async (id, query) => {
      await delay(220);
      const needle = query.text.trim().toLowerCase();
      const glob = needle.includes('*') || needle.includes('?');
      const pattern = new RegExp(
        `^${needle
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replaceAll('*', '.*')
          .replaceAll('?', '.')}$`,
      );
      const matches = [...nodes.keys()]
        .filter((path) => path.startsWith(`${query.root === '/' ? '' : query.root}/`))
        .map(toEntry)
        .filter((entry) => query.showHidden || !entry.path.includes('/.'))
        .filter((entry) => {
          const name = entry.name.toLowerCase();
          if (glob ? pattern.test(name) : name.includes(needle)) return true;
          const text = nodes.get(entry.path)?.text;
          return query.contents && !glob && text?.toLowerCase().includes(needle) === true;
        });
      emit((events) => events.searchResults(id, matches));
      emit((events) =>
        events.searchDone({
          id,
          summary: {
            scanned: nodes.size,
            matched: matches.length,
            truncated: false,
            cancelled: false,
          },
          error: null,
        }),
      );
    },
    folderSize: async (_id, path) => {
      await delay(300);
      const items = subtree(path).filter((item) => item !== path);
      const files = items.filter((item) => nodes.get(item)?.isDir === false);
      return {
        bytes: files.reduce((sum, item) => sum + (nodes.get(item)?.size ?? 0), 0),
        files: files.length,
        folders: items.length - files.length,
        cancelled: false,
      };
    },
    cancelTask: async (id) => {
      cancelled.add(id);
    },
    previewUrl: (path) => mockImage(path),
    thumbnailUrl: (path) => mockImage(path),
    subscribe: async (events) => {
      listeners.add(events);
      return () => listeners.delete(events);
    },
  };
}

/** A generated landscape (SVG data URL) standing in for a photo in the browser mock. */
function mockImage(path: string): string {
  let hash = 0;
  for (const char of path) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const hue = 190 + (hash % 60);
  const sun = 30 + (hash % 40);
  const ridge = 55 + (hash % 20);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 45% 32%)"/><stop offset="1" stop-color="hsl(${hue + 20} 55% 72%)"/></linearGradient></defs><rect width="400" height="260" fill="url(#s)"/><circle cx="${280 - sun}" cy="${70 + (hash % 30)}" r="26" fill="hsl(45 90% 80%)" opacity=".9"/><path d="M0 ${ridge * 2.6} L90 ${ridge * 1.6} L170 ${ridge * 2.3} L260 ${ridge * 1.3} L400 ${ridge * 2.4} L400 260 L0 260Z" fill="hsl(${hue + 10} 25% 22%)"/><path d="M0 230 L120 185 L230 215 L330 175 L400 200 L400 260 L0 260Z" fill="hsl(${hue + 30} 20% 14%)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
