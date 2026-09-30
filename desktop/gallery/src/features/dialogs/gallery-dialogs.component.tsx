import { useGallery } from '../../app/gallery.context';
import {
  DeleteAlbumDialog,
  ForgetDialog,
  RemoveFolderDialog,
  TrashDialog,
} from './confirm-dialogs.component';
import { DuplicatesDialog } from './duplicates-dialog.component';
import { ExportDialog } from './export-dialog.component';
import {
  AddTagDialog,
  NewAlbumDialog,
  RenameAlbumDialog,
  RenameDialog,
} from './name-dialogs.component';
import { SettingsDialog } from './settings-dialog.component';
import { ShortcutsDialog } from './shortcuts-dialog.component';

/** The one dialog on screen (`api.dialog`), if any. */
export function GalleryDialogs() {
  const { dialog } = useGallery();
  switch (dialog.type) {
    case 'none':
      return null;
    case 'settings':
      return <SettingsDialog />;
    case 'shortcuts':
      return <ShortcutsDialog />;
    case 'trash':
      return <TrashDialog ids={dialog.ids} />;
    case 'forget':
      return <ForgetDialog ids={dialog.ids} />;
    case 'remove-folder':
      return <RemoveFolderDialog path={dialog.path} />;
    case 'delete-album':
      return <DeleteAlbumDialog id={dialog.id} name={dialog.name} />;
    case 'new-album':
      return <NewAlbumDialog ids={dialog.ids} />;
    case 'rename-album':
      return <RenameAlbumDialog id={dialog.id} name={dialog.name} />;
    case 'rename':
      return <RenameDialog id={dialog.id} name={dialog.name} />;
    case 'add-tag':
      return <AddTagDialog ids={dialog.ids} />;
    case 'export':
      return <ExportDialog ids={dialog.ids} />;
    case 'duplicates':
      return <DuplicatesDialog />;
  }
}
