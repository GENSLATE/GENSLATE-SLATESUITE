import { useTerminal } from '../../app/terminal.context';
import { ClearHistoryDialog, CloseDialog, PasteDialog } from './confirm-dialogs.component';
import { RenameTabDialog, SnippetDialog } from './edit-dialogs.component';
import { SettingsDialog } from './settings-dialog.component';
import { ShortcutsDialog } from './shortcuts-dialog.component';

/** The one dialog on screen (`api.dialog`), if any. */
export function TerminalDialogs() {
  const { dialog } = useTerminal();
  switch (dialog.type) {
    case 'none':
      return null;
    case 'settings':
      return <SettingsDialog />;
    case 'shortcuts':
      return <ShortcutsDialog />;
    case 'snippet':
      return <SnippetDialog snippet={dialog.snippet} />;
    case 'rename-tab':
      return <RenameTabDialog key={dialog.tabId} tabId={dialog.tabId} />;
    case 'paste':
      return <PasteDialog paneId={dialog.paneId} text={dialog.text} review={dialog.review} />;
    case 'close':
      return <CloseDialog target={dialog.target} running={dialog.running} />;
    case 'clear-history':
      return <ClearHistoryDialog />;
  }
}
