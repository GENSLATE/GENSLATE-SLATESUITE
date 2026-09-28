import { useToast } from '@genslate/design-system';
import { useEffect, useEffectEvent, useState } from 'react';

import type { ExplorerBackend } from '../ipc/explorer.client';
import { listenTo } from '../ipc/explorer.events';
import type { Entry } from '../ipc/explorer.types';
import { plural } from '../model/format.util';
import { baseName, parentOf } from '../model/path.util';
import { errorMessage } from './error-message.util';
import type { NewItemKind } from './explorer.context';

export interface FileOperationsOptions {
  readonly backend: ExplorerBackend;
  readonly initialUndo: string | null;
  /** The platform can put trashed items back (so Trash offers Undo). */
  readonly canUndoTrash: boolean;
  /** The folder new items go into. */
  readonly currentFolder: () => string;
  readonly refresh: (folders: readonly string[]) => void;
  readonly reloadAll: () => void;
  /** Select `paths` in the current folder once it has reloaded. */
  readonly selectPaths: (paths: readonly string[]) => void;
  /** A folder moved: tabs showing it (or something inside) follow. */
  readonly relocate: (from: string, to: string) => void;
}

const NEW_ITEMS: Readonly<Record<NewItemKind, { name: string; folder: boolean }>> = {
  folder: { name: 'New folder', folder: true },
  text: { name: 'New text file.txt', folder: false },
  markdown: { name: 'New note.md', folder: false },
};

/** Single-step operations (create, rename, trash, delete, undo, open), reported as toasts. */
export function useFileOperations(options: FileOperationsOptions) {
  const { backend, refresh } = options;
  const toast = useToast();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [undoLabel, setUndoLabel] = useState(options.initialUndo);

  const report = (title: string, error: unknown) =>
    toast.add({ title, description: errorMessage(error), type: 'error' });

  const onUndoChanged = useEffectEvent((label: string | null) => setUndoLabel(label));
  useEffect(() => listenTo(backend, { undo: (label) => onUndoChanged(label) }), [backend]);

  const parents = (paths: readonly string[]) => [
    ...new Set(paths.map((path) => parentOf(path)).filter((path): path is string => path !== null)),
  ];

  function undo() {
    backend.undo().then(
      (label) => {
        options.reloadAll();
        toast.add(
          label === null
            ? { title: 'Nothing to undo', type: 'info' }
            : { title: `Undid ${label}`, type: 'success' },
        );
      },
      (error: unknown) => {
        options.reloadAll();
        report('Couldn’t undo', error);
      },
    );
  }

  const undoAction = { children: 'Undo', onClick: undo };

  return {
    renaming,
    undoLabel,
    undo,
    report,
    startRename: (path: string) => setRenaming(path),
    cancelRename: () => setRenaming(null),
    commitRename(path: string, name: string) {
      setRenaming(null);
      if (name.trim() === '' || name === baseName(path)) return;
      backend.rename(path, name).then(
        (entry) => {
          refresh(parents([path]));
          options.selectPaths([entry.path]);
          if (entry.isDir) options.relocate(path, entry.path);
        },
        (error: unknown) => report(`Couldn’t rename “${baseName(path)}”`, error),
      );
    },
    createItem(kind: NewItemKind) {
      const folder = options.currentFolder();
      const item = NEW_ITEMS[kind];
      const created = item.folder
        ? backend.createFolder(folder, item.name)
        : backend.createFile(folder, item.name);
      created.then(
        (entry: Entry) => {
          refresh([folder]);
          options.selectPaths([entry.path]);
          setRenaming(entry.path);
        },
        (error: unknown) =>
          report(`Couldn’t create ${item.folder ? 'the folder' : 'the file'}`, error),
      );
    },
    trash(paths: readonly string[]) {
      if (paths.length === 0) return;
      backend.trash(paths).then(
        () => {
          refresh(parents(paths));
          toast.add({
            title: `Moved ${paths.length === 1 ? `“${baseName(paths[0] ?? '')}”` : plural(paths.length, 'item')} to the Trash`,
            type: 'success',
            ...(options.canUndoTrash ? { actionProps: undoAction } : {}),
          });
        },
        (error: unknown) => report('Couldn’t move to the Trash', error),
      );
    },
    deletePermanently(paths: readonly string[]) {
      backend.deletePermanently(paths).then(
        () => {
          refresh(parents(paths));
          toast.add({ title: `Deleted ${plural(paths.length, 'item')} for good`, type: 'success' });
        },
        (error: unknown) => report('Couldn’t delete', error),
      );
    },
    open(entry: Entry, navigate: (path: string) => void) {
      if (entry.isDir) {
        navigate(entry.path);
        return;
      }
      backend
        .openPath(entry.path)
        .catch((error: unknown) => report(`Couldn’t open “${entry.name}”`, error));
    },
    openWith(entry: Entry) {
      backend
        .openWith(entry.path)
        .catch((error: unknown) => report('Couldn’t show “Open with”', error));
    },
    reveal(path: string) {
      backend
        .reveal(path)
        .catch((error: unknown) => report('Couldn’t show it in the file manager', error));
    },
    copyText(text: string, what: string) {
      navigator.clipboard.writeText(text).then(
        () => toast.add({ title: `Copied ${what}`, type: 'success', timeout: 2000 }),
        (error: unknown) => report('Clipboard unavailable', error),
      );
    },
  };
}
