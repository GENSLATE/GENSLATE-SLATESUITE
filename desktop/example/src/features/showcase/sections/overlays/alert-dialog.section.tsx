import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

export function AlertDialogSection() {
  return (
    <Specimen
      title="Alert dialog"
      description="A decision the user must make; no outside-click dismissal. Destructive tone for irreversible actions."
      stageClassName="gap-3"
    >
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="danger" />}>
          Discard changes…
        </AlertDialogTrigger>
        <AlertDialogPopup tone="danger">
          <AlertDialogTitle>Discard 3 unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Your changes to tree.tsx, tabs.tsx and index.ts will be lost.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose tone="danger">Discard</AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
      <AlertDialog>
        <AlertDialogTrigger render={<Button />}>Save before closing…</AlertDialogTrigger>
        <AlertDialogPopup icon="codicon:save">
          <AlertDialogTitle>Save changes to “main.tsx”?</AlertDialogTitle>
          <AlertDialogDescription>
            If you don’t save, your changes will be lost.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose className="mr-auto">Don’t Save</AlertDialogClose>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose tone="primary">Save</AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </Specimen>
  );
}
