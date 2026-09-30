import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@genslate/design-system';
import type { ReactNode } from 'react';

import { useGallery } from '../../app/gallery.context';
import { plural } from '../../model/format.util';
import { baseName } from '../../model/path.util';

/** “IMG_2041.jpg”, or “3 items”. */
function useSubject(ids: readonly number[]): string {
  const api = useGallery();
  const [first] = ids;
  const item = ids.length === 1 && first !== undefined ? api.itemById(first) : undefined;
  return item === undefined ? plural(ids.length, 'item') : `“${item.name}”`;
}

interface ConfirmProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly action: string;
  readonly tone: 'primary' | 'danger';
  readonly icon?: 'codicon:trash' | 'codicon:folder' | 'codicon:book';
  readonly onConfirm: () => void;
}

function Confirm({ title, children, action, tone, icon, onConfirm }: ConfirmProps) {
  const api = useGallery();
  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <AlertDialogPopup tone={tone === 'danger' ? 'danger' : undefined} icon={icon}>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{children}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogClose>Cancel</AlertDialogClose>
          <AlertDialogClose tone={tone} onClick={onConfirm}>
            {action}
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/** Move to Trash, when `confirm-trash` is on. */
export function TrashDialog({ ids }: { readonly ids: readonly number[] }) {
  const api = useGallery();
  return (
    <Confirm
      title={`Move ${useSubject(ids)} to the Trash?`}
      action="Move to Trash"
      tone="primary"
      icon="codicon:trash"
      onConfirm={() => api.trash(ids, true)}
    >
      The files go to your computer’s Trash.{' '}
      {api.context.canRestore
        ? 'You can put them back from Gallery’s Trash.'
        : 'You can put them back from the Trash.'}
    </Confirm>
  );
}

/** Drops trashed items from Gallery’s Trash list (the files stay in the system Trash). */
export function ForgetDialog({ ids }: { readonly ids: readonly number[] }) {
  const api = useGallery();
  return (
    <Confirm
      title={`Remove ${useSubject(ids)} from this list?`}
      action="Remove"
      tone="danger"
      onConfirm={() => api.forget(ids)}
    >
      They stay in your computer’s Trash until you empty it, but Gallery won’t be able to put them
      back.
    </Confirm>
  );
}

/** Stops watching a library folder (its files are not touched). */
export function RemoveFolderDialog({ path }: { readonly path: string }) {
  const api = useGallery();
  return (
    <Confirm
      title={`Remove “${baseName(path)}” from the library?`}
      action="Remove folder"
      tone="danger"
      icon="codicon:folder"
      onConfirm={() => api.removeFolder(path)}
    >
      Its photos leave Gallery, with their favorites, ratings and tags. The files on disk are not
      touched.
    </Confirm>
  );
}

/** Deletes an album (its photos stay in the library). */
export function DeleteAlbumDialog({ id, name }: { readonly id: number; readonly name: string }) {
  const api = useGallery();
  return (
    <Confirm
      title={`Delete the album “${name}”?`}
      action="Delete album"
      tone="danger"
      icon="codicon:book"
      onConfirm={() => api.deleteAlbum(id)}
    >
      The photos stay in your library and on disk.
    </Confirm>
  );
}
