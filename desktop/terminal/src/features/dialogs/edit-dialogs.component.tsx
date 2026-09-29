import {
  Button,
  cn,
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  Switch,
  Textarea,
  TextField,
} from '@genslate/design-system';
import { type FormEvent, useState } from 'react';

import { useTerminal } from '../../app/terminal.context';
import type { SnippetDraft } from '../../ipc/terminal.types';
import { COLOR_CHOICES, colorFill } from '../tabs/profile-visual.util';

/** Adds or edits a snippet. */
export function SnippetDialog({ snippet }: { readonly snippet: SnippetDraft }) {
  const api = useTerminal();
  const [draft, setDraft] = useState<SnippetDraft>(snippet);
  const [saving, setSaving] = useState(false);
  const valid = draft.name.trim() !== '' && draft.command.trim() !== '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setSaving(true);
    const saved = await api.saveSnippet(draft);
    setSaving(false);
    if (saved) api.closeDialog();
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="md" showClose>
        <DialogTitle>{snippet.id === null ? 'New snippet' : 'Edit snippet'}</DialogTitle>
        <form onSubmit={(event) => void submit(event)}>
          <DialogBody className="flex flex-col gap-4">
            <TextField
              label="Name"
              placeholder="Start the dev server"
              autoFocus
              value={draft.name}
              onValueChange={(name) => setDraft({ ...draft, name })}
            />
            <Textarea
              label="Command"
              placeholder="bun run dev"
              spellCheck={false}
              minRows={2}
              maxRows={8}
              autoGrow
              textareaClassName="font-mono text-sm"
              value={draft.command}
              onValueChange={(command) => setDraft({ ...draft, command })}
            />
            <TextField
              label="Description"
              placeholder="Optional"
              value={draft.description}
              onValueChange={(description) => setDraft({ ...draft, description })}
            />
            <Switch
              label="Run it right away"
              description="Press Enter after typing it. Off: it waits at the prompt for you."
              checked={draft.run}
              onCheckedChange={(run) => setDraft({ ...draft, run })}
            />
          </DialogBody>
          <DialogFooter>
            {snippet.id === null ? null : (
              <Button
                variant="danger"
                className="mr-auto"
                onClick={() => {
                  if (snippet.id !== null) api.deleteSnippet(snippet.id);
                  api.closeDialog();
                }}
              >
                Delete
              </Button>
            )}
            <DialogClose>Cancel</DialogClose>
            <Button type="submit" variant="primary" disabled={!valid} loading={saving}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

/** Renames a tab and picks its colour. */
export function RenameTabDialog({ tabId }: { readonly tabId: string }) {
  const api = useTerminal();
  const tab = api.layout.tabs.find((candidate) => candidate.id === tabId);
  const [title, setTitle] = useState(tab?.title ?? '');
  if (tab === undefined) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    api.dispatch({ type: 'rename-tab', id: tabId, title: title.trim() === '' ? null : title });
    api.closeDialog();
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="sm" showClose>
        <DialogTitle>Rename tab</DialogTitle>
        <form onSubmit={submit}>
          <DialogBody className="flex flex-col gap-4">
            <TextField
              label="Name"
              description="Leave it empty to show what the shell calls itself."
              autoFocus
              value={title}
              onValueChange={setTitle}
            />
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 font-medium text-fg text-sm">Colour</legend>
              <div className="flex gap-2">
                <ColorChip
                  label="None"
                  selected={tab.color === null}
                  className="bg-fill-pressed"
                  onClick={() => api.setTabColor(tabId, null)}
                />
                {COLOR_CHOICES.map((choice) => (
                  <ColorChip
                    key={choice.value}
                    label={choice.label}
                    selected={tab.color === choice.value}
                    className={colorFill(choice.value)}
                    onClick={() => api.setTabColor(tabId, choice.value)}
                  />
                ))}
              </div>
            </fieldset>
          </DialogBody>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
            <Button type="submit" variant="primary">
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

function ColorChip({
  label,
  selected,
  className,
  onClick,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly className: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
      className={cn(
        'focus-ring size-6 cursor-interactive rounded-full ring-offset-2 ring-offset-surface-dialog transition-transform duration-fast ease-spring hover:scale-110',
        selected && 'ring-2 ring-accent',
        className,
      )}
    />
  );
}
