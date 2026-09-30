import { useToast } from '@genslate/design-system';
import { useEffect, useEffectEvent, useState } from 'react';

import type { GalleryBackend } from '../ipc/gallery.client';
import { listenTo } from '../ipc/gallery.events';
import type { MediaItem, Recipe, TransferOutcome } from '../ipc/gallery.types';
import { plural } from '../model/format.util';
import { baseName } from '../model/path.util';
import { errorMessage } from './error-message.util';

export interface MediaActionsOptions {
  readonly backend: GalleryBackend;
  readonly initialUndo: string | null;
  /** Trashed items can be put back (so Trash offers Undo). */
  readonly canRestore: boolean;
  /** Refetch after a change (events may be unavailable). */
  readonly reload: () => void;
  readonly nameOf: (id: number) => string | undefined;
}

/** Every single-step change to library items, reported as toasts. */
export function useMediaActions(options: MediaActionsOptions) {
  const { backend, reload } = options;
  const toast = useToast();
  const [undoLabel, setUndoLabel] = useState(options.initialUndo);

  const report = (title: string, error: unknown) =>
    toast.add({ title, description: errorMessage(error), type: 'error' });

  const onUndoChanged = useEffectEvent((label: string | null) => setUndoLabel(label));
  useEffect(() => listenTo(backend, { undo: (label) => onUndoChanged(label) }), [backend]);

  /** Runs a change, reloads, and reports a failure under `title`. */
  function run<T>(title: string, work: Promise<T>, done?: (value: T) => void) {
    work.then(
      (value) => {
        reload();
        done?.(value);
      },
      (error: unknown) => report(title, error),
    );
  }

  const subject = (ids: readonly number[]) => {
    const [first] = ids;
    const name = ids.length === 1 && first !== undefined ? options.nameOf(first) : undefined;
    return name === undefined ? plural(ids.length, 'item') : `“${name}”`;
  };

  function undo() {
    backend.undo().then(
      () => {
        reload();
        toast.add({ title: 'Undone', type: 'success', timeout: 2500 });
      },
      (error: unknown) => {
        reload();
        report('Couldn’t undo', error);
      },
    );
  }
  const undoAction = { children: 'Undo', onClick: undo };

  const transferred = (verb: string, outcome: TransferOutcome) => {
    if (outcome.destination === null) return;
    const where = baseName(outcome.destination);
    if (outcome.failed.length > 0) {
      toast.add({
        title: `${verb} ${plural(outcome.done, 'item')} to “${where}”`,
        description: `${plural(outcome.failed.length, 'item')} couldn’t be ${verb === 'Moved' ? 'moved' : 'copied'}: ${outcome.failed[0]?.[1] ?? ''}`,
        type: 'warning',
      });
    } else if (outcome.done > 0) {
      toast.add({
        title: `${verb} ${plural(outcome.done, 'item')} to “${where}”`,
        type: 'success',
        ...(verb === 'Moved' ? { actionProps: undoAction } : {}),
      });
    }
  };

  return {
    undoLabel,
    undo,
    report,
    favorite(ids: readonly number[], favorite: boolean) {
      run('Couldn’t update favorites', backend.setFavorite(ids, favorite));
    },
    rate(ids: readonly number[], rating: number) {
      run('Couldn’t save the rating', backend.setRating(ids, rating));
    },
    addTag(ids: readonly number[], name: string) {
      run('Couldn’t add the tag', backend.addTag(ids, name), (tag) =>
        toast.add({ title: `Tagged ${subject(ids)} #${tag}`, type: 'success', timeout: 2500 }),
      );
    },
    removeTag(ids: readonly number[], name: string) {
      run('Couldn’t remove the tag', backend.removeTag(ids, name));
    },
    createAlbum(name: string, ids: readonly number[]) {
      run('Couldn’t create the album', backend.createAlbum(name, ids), (album) =>
        toast.add({
          title: `Created “${album.name}”`,
          description: ids.length > 0 ? `With ${plural(ids.length, 'item')}.` : undefined,
          type: 'success',
        }),
      );
    },
    renameAlbum(id: number, name: string) {
      run('Couldn’t rename the album', backend.renameAlbum(id, name));
    },
    deleteAlbum(id: number) {
      run('Couldn’t delete the album', backend.deleteAlbum(id));
    },
    addToAlbum(album: number, ids: readonly number[], albumName: string) {
      run('Couldn’t add to the album', backend.addToAlbum(album, ids), (added) =>
        toast.add({
          title:
            added === 0
              ? `Already in “${albumName}”`
              : `Added ${plural(added, 'item')} to “${albumName}”`,
          type: 'success',
          timeout: 2500,
        }),
      );
    },
    removeFromAlbum(album: number, ids: readonly number[]) {
      run('Couldn’t remove from the album', backend.removeFromAlbum(album, ids));
    },
    rename(id: number, name: string) {
      run('Couldn’t rename', backend.rename(id, name));
    },
    move(ids: readonly number[]) {
      run('Couldn’t move', backend.move(ids, null), (outcome) => transferred('Moved', outcome));
    },
    copy(ids: readonly number[]) {
      run('Couldn’t copy', backend.copy(ids, null), (outcome) => transferred('Copied', outcome));
    },
    trash(ids: readonly number[]) {
      const what = subject(ids);
      run('Couldn’t move to the Trash', backend.trash(ids), () =>
        toast.add({
          title: `Moved ${what} to the Trash`,
          type: 'success',
          ...(options.canRestore ? { actionProps: undoAction } : {}),
        }),
      );
    },
    restore(ids: readonly number[]) {
      run('Couldn’t put it back', backend.restore(ids), (count) =>
        toast.add({
          title:
            count === ids.length
              ? `Put back ${plural(count, 'item')}`
              : `Put back ${count} of ${plural(ids.length, 'item')}`,
          description:
            count === ids.length ? undefined : 'The others are no longer in the system Trash.',
          type: count === ids.length ? 'success' : 'warning',
        }),
      );
    },
    forget(ids: readonly number[]) {
      run('Couldn’t remove from the list', backend.forget(ids));
    },
    open(id: number) {
      backend.open(id).catch((error: unknown) => report('Couldn’t open it', error));
    },
    reveal(id: number) {
      backend
        .reveal(id)
        .catch((error: unknown) => report('Couldn’t show it in the file manager', error));
    },
    saveEdit(id: number, recipe: Recipe): Promise<boolean> {
      return backend.saveEdit(id, recipe).then(
        (item: MediaItem) => {
          reload();
          toast.add({
            title: `Saved “${item.name}”`,
            description: 'The original is unchanged.',
            type: 'success',
          });
          return true;
        },
        (error: unknown) => {
          report('Couldn’t save the edited copy', error);
          return false;
        },
      );
    },
    copyText(text: string, what: string) {
      navigator.clipboard.writeText(text).then(
        () => toast.add({ title: `Copied ${what}`, type: 'success', timeout: 2000 }),
        (error: unknown) => report('Clipboard unavailable', error),
      );
    },
    addFolder() {
      run('Couldn’t add the folder', backend.addFolder(), (folder) => {
        if (folder !== null) {
          toast.add({
            title: `Adding “${baseName(folder)}”`,
            description: 'Photos appear as they are found.',
            type: 'info',
          });
        }
      });
    },
    addFolderPath(path: string) {
      run('Couldn’t add the folder', backend.addFolderPath(path), (folder) =>
        toast.add({
          title: `Adding “${baseName(folder)}”`,
          description: 'Photos appear as they are found.',
          type: 'info',
        }),
      );
    },
    removeFolder(path: string) {
      run('Couldn’t remove the folder', backend.removeFolder(path), () =>
        toast.add({
          title: `Removed “${baseName(path)}” from Gallery`,
          description: 'The files are still on your drive.',
          type: 'success',
        }),
      );
    },
    rescan() {
      run('Couldn’t rescan', backend.rescan());
    },
  };
}
