import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
  TextField,
} from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

export function DialogSection() {
  return (
    <Specimen
      title="Dialog"
      description="Scrim, 12px radius, and a sheet-like entrance (drop and settle). Primary action last."
      stageClassName="gap-3"
      code={`<Dialog>\n  <DialogTrigger render={<Button />}>Rename…</DialogTrigger>\n  <DialogPopup size="sm">\n    <DialogTitle>Rename file</DialogTitle>\n    <DialogFooter>\n      <DialogClose>Cancel</DialogClose>\n      <DialogClose tone="primary">Rename</DialogClose>\n    </DialogFooter>\n  </DialogPopup>\n</Dialog>`}
    >
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Dialog key={size}>
          <DialogTrigger render={<Button />}>{`Open ${size}`}</DialogTrigger>
          <DialogPopup size={size} showClose>
            <DialogTitle>Create a new project</DialogTitle>
            <DialogDescription>Projects group windows, settings and history.</DialogDescription>
            <DialogBody className="flex flex-col gap-4">
              <TextField label="Name" defaultValue="genslate-app" />
              <TextField
                label="Location"
                defaultValue="~/Projects"
                description="The folder is created if missing."
              />
              <Checkbox label="Initialise a git repository" defaultChecked />
            </DialogBody>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <DialogClose tone="primary">Create</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      ))}
    </Specimen>
  );
}
