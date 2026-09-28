import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogPopup,
  AlertDialogTitle,
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  Icon,
} from '@genslate/design-system';

import { useExplorer } from '../../app/explorer.context';
import type { TransferMode } from '../../ipc/explorer.types';
import { plural } from '../../model/format.util';
import { baseName } from '../../model/path.util';

const LISTED = 5;

function subject(paths: readonly string[]): string {
  const [first] = paths;
  return paths.length === 1 && first !== undefined
    ? `“${baseName(first)}”`
    : plural(paths.length, 'item');
}

/** Move to Trash, when `confirm-trash` is on. */
export function TrashDialog({ paths }: { readonly paths: readonly string[] }) {
  const api = useExplorer();
  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <AlertDialogPopup icon="codicon:trash">
        <AlertDialogTitle>Move {subject(paths)} to the Trash?</AlertDialogTitle>
        <AlertDialogDescription>
          You can put {paths.length === 1 ? 'it' : 'them'} back from the Trash.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogClose>Cancel</AlertDialogClose>
          <AlertDialogClose tone="primary" onClick={() => api.trash(paths, true)}>
            Move to Trash
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/** Delete permanently: always confirmed, never undoable. */
export function DeleteDialog({ paths }: { readonly paths: readonly string[] }) {
  const api = useExplorer();
  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <AlertDialogPopup tone="danger">
        <AlertDialogTitle>Delete {subject(paths)} permanently?</AlertDialogTitle>
        <AlertDialogDescription>
          {paths.length === 1 ? 'It' : 'They'} will not go to the Trash. This can’t be undone.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogClose>Cancel</AlertDialogClose>
          <AlertDialogClose tone="danger" onClick={() => api.deletePermanently(paths)}>
            Delete
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

interface ConflictDialogProps {
  readonly mode: TransferMode;
  readonly sources: readonly string[];
  readonly destination: string;
  readonly names: readonly string[];
}

/** Some items already exist where they are going: replace, keep both, or skip them. */
export function ConflictDialog({ mode, sources, destination, names }: ConflictDialogProps) {
  const api = useExplorer();
  const run = (policy: 'replace' | 'keep-both' | 'skip') =>
    api.transfer(mode, sources, destination, policy);
  const rest = names.length - LISTED;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="sm">
        <DialogTitle>
          {names.length === 1
            ? `“${names[0] ?? ''}” already exists`
            : `${plural(names.length, 'item')} already exist`}
        </DialogTitle>
        <DialogDescription>
          In “{baseName(destination)}”. {mode === 'copy' ? 'Copying' : 'Moving'}{' '}
          {plural(sources.length, 'item')} there.
        </DialogDescription>
        <DialogBody>
          <ul className="flex flex-col gap-1 rounded-card bg-surface-sunken p-2 text-sm">
            {names.slice(0, LISTED).map((name) => (
              <li key={name} className="flex items-center gap-2 truncate text-fg">
                <Icon name="codicon:file-text" size={14} className="text-fg-muted" />
                <span className="truncate">{name}</span>
              </li>
            ))}
            {rest > 0 ? (
              <li className="pl-6 text-fg-muted">and {rest.toLocaleString()} more</li>
            ) : null}
          </ul>
          <p className="mt-3 text-fg-secondary text-sm">Replaced items go to the Trash.</p>
        </DialogBody>
        <DialogFooter>
          <DialogClose onClick={() => run('skip')}>
            Skip {names.length === 1 ? 'it' : 'these'}
          </DialogClose>
          <DialogClose onClick={() => run('keep-both')}>Keep both</DialogClose>
          <DialogClose tone="primary" onClick={() => run('replace')}>
            Replace
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
