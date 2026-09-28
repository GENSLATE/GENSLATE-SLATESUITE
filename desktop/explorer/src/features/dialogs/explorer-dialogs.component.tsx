import { useExplorer } from '../../app/explorer.context';
import { ConflictDialog, DeleteDialog, TrashDialog } from './confirm-dialogs.component';
import { PropertiesDialog } from './properties-dialog.component';
import { SettingsDialog } from './settings-dialog.component';
import { ShortcutsDialog } from './shortcuts-dialog.component';

/** The one dialog on screen (`api.dialog`), if any. */
export function ExplorerDialogs() {
  const { dialog } = useExplorer();
  switch (dialog.type) {
    case 'none':
      return null;
    case 'conflict':
      return (
        <ConflictDialog
          mode={dialog.mode}
          sources={dialog.sources}
          destination={dialog.destination}
          names={dialog.names}
        />
      );
    case 'trash':
      return <TrashDialog paths={dialog.paths} />;
    case 'delete':
      return <DeleteDialog paths={dialog.paths} />;
    case 'properties':
      return <PropertiesDialog key={dialog.path} path={dialog.path} />;
    case 'settings':
      return <SettingsDialog />;
    case 'shortcuts':
      return <ShortcutsDialog />;
  }
}
