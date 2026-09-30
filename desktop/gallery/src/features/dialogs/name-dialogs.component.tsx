import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  TextField,
} from '@genslate/design-system';
import { type FormEvent, useState } from 'react';

import { useGallery } from '../../app/gallery.context';
import { plural } from '../../model/format.util';

/** Characters no file system accepts in a name. */
const BAD_NAME = /[<>:"/\\|?*]/;

interface NameDialogProps {
  readonly title: string;
  readonly description?: string;
  readonly label: string;
  readonly initial: string;
  readonly action: string;
  /** Selects the name without its extension (renaming a file). */
  readonly keepExtension?: boolean;
  /** An error for this value, or `null` when it is fine. */
  readonly validate?: (value: string) => string | null;
  readonly suggestions?: readonly string[];
  readonly onSubmit: (value: string) => void;
}

/** One text box and a primary action: names for albums, files and tags. */
function NameDialog({
  title,
  description,
  label,
  initial,
  action,
  keepExtension = false,
  validate,
  suggestions = [],
  onSubmit,
}: NameDialogProps) {
  const api = useGallery();
  const [value, setValue] = useState(initial);
  const trimmed = value.trim();
  const error = trimmed === '' ? null : (validate?.(trimmed) ?? null);
  const ready = trimmed !== '' && error === null && trimmed !== initial;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    onSubmit(trimmed);
    api.closeDialog();
  };
  // Select the stem so typing replaces the name but keeps ".jpg".
  const selectStem = (input: HTMLInputElement | null) => {
    if (input === null) return;
    const dot = keepExtension ? initial.lastIndexOf('.') : -1;
    input.focus();
    input.setSelectionRange(0, dot > 0 ? dot : initial.length);
  };
  const matches = suggestions
    .filter((name) => trimmed === '' || name.toLowerCase().includes(trimmed.toLowerCase()))
    .filter((name) => name !== trimmed)
    .slice(0, 8);

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="sm">
        <form onSubmit={submit} className="contents">
          <DialogTitle>{title}</DialogTitle>
          {description === undefined ? null : <DialogDescription>{description}</DialogDescription>}
          <DialogBody className="flex flex-col gap-3">
            <TextField
              ref={selectStem}
              label={label}
              value={value}
              onValueChange={setValue}
              error={error ?? undefined}
              autoComplete="off"
              spellCheck={false}
            />
            {matches.length === 0 ? null : (
              <div className="flex flex-wrap gap-1.5">
                {matches.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setValue(name)}
                    className="focus-ring h-6 cursor-interactive rounded-full bg-fill-hover px-2.5 text-fg text-xs transition-colors duration-fast ease-standard hover:bg-fill-pressed"
                  >
                    #{name}
                  </button>
                ))}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
            <DialogClose tone="primary" type="submit" disabled={!ready}>
              {action}
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

export function NewAlbumDialog({ ids }: { readonly ids: readonly number[] }) {
  const api = useGallery();
  const taken = new Set(api.summary?.albums.map((album) => album.name.toLowerCase()) ?? []);
  return (
    <NameDialog
      title="New album"
      description={
        ids.length === 0 ? 'Add photos to it later.' : `With ${plural(ids.length, 'item')}.`
      }
      label="Name"
      initial=""
      action="Create"
      validate={(name) => (taken.has(name.toLowerCase()) ? 'An album has this name.' : null)}
      onSubmit={(name) => api.createAlbum(name, ids)}
    />
  );
}

export function RenameAlbumDialog({ id, name }: { readonly id: number; readonly name: string }) {
  const api = useGallery();
  const taken = new Set(
    api.summary?.albums
      .filter((album) => album.id !== id)
      .map((album) => album.name.toLowerCase()) ?? [],
  );
  return (
    <NameDialog
      title="Rename album"
      label="Name"
      initial={name}
      action="Rename"
      validate={(value) => (taken.has(value.toLowerCase()) ? 'An album has this name.' : null)}
      onSubmit={(value) => api.renameAlbum(id, value)}
    />
  );
}

export function RenameDialog({ id, name }: { readonly id: number; readonly name: string }) {
  const api = useGallery();
  return (
    <NameDialog
      title="Rename"
      description="Renames the file on disk. Undo puts the old name back."
      label="File name"
      initial={name}
      action="Rename"
      keepExtension
      validate={(value) =>
        BAD_NAME.test(value)
          ? 'A name can’t contain < > : " / \\ | ? or *.'
          : value.startsWith('.')
            ? 'A name can’t start with a dot.'
            : null
      }
      onSubmit={(value) => api.rename(id, value)}
    />
  );
}

export function AddTagDialog({ ids }: { readonly ids: readonly number[] }) {
  const api = useGallery();
  return (
    <NameDialog
      title="Add a tag"
      description={`To ${plural(ids.length, 'item')}. Tags are yours to search and browse by.`}
      label="Tag"
      initial=""
      action="Add tag"
      suggestions={api.summary?.tags.map((tag) => tag.name) ?? []}
      onSubmit={(name) => api.addTag(ids, name.replace(/^#/, ''))}
    />
  );
}
