import {
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  Icon,
  Spinner,
} from '@genslate/design-system';
import { type ReactNode, useEffect, useState } from 'react';

import { errorMessage } from '../../app/error-message.util';
import { useExplorer } from '../../app/explorer.context';
import type { FolderSize, Properties } from '../../ipc/explorer.types';
import { entryIcon } from '../../model/file-icon.util';
import { formatBytes, formatFullDate, kindLabel, plural } from '../../model/format.util';
import { parentOf } from '../../model/path.util';

type Loaded<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly value: T }
  | { readonly status: 'error'; readonly message: string };

let counter = 0;

/** Everything about one item, with the total size of a folder (counted in the background). */
export function PropertiesDialog({ path }: { readonly path: string }) {
  const api = useExplorer();
  const [properties, setProperties] = useState<Loaded<Properties>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    api.backend.properties(path).then(
      (value) => {
        if (active) setProperties({ status: 'ready', value });
      },
      (error: unknown) => {
        if (active) setProperties({ status: 'error', message: errorMessage(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [api.backend, path]);

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="sm" showClose>
        {properties.status === 'ready' ? (
          <Details properties={properties.value} />
        ) : (
          <>
            <DialogTitle>Properties</DialogTitle>
            <DialogBody>
              {properties.status === 'loading' ? (
                <div className="grid h-32 place-items-center">
                  <Spinner size={20} label="Reading properties" />
                </div>
              ) : (
                <p className="text-danger-fg text-sm">{properties.message}</p>
              )}
            </DialogBody>
          </>
        )}
        <DialogFooter>
          <DialogClose tone="primary">Done</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function Details({ properties }: { readonly properties: Properties }) {
  const api = useExplorer();
  const { entry } = properties;
  const where = parentOf(entry.path);

  return (
    <>
      <div className="flex items-center gap-3 pr-8">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-fill-hover text-fg-secondary">
          <Icon name={entryIcon(entry)} size={20} />
        </span>
        <div className="min-w-0">
          <DialogTitle className="break-words">{entry.name}</DialogTitle>
          <p className="text-fg-muted text-sm">{kindLabel(entry)}</p>
        </div>
      </div>
      <DialogBody>
        <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
          <Row label="Where">
            <span className="break-all">{where ?? entry.path}</span>
          </Row>
          <Row label="Size">
            {entry.isDir ? <FolderSizeValue path={entry.path} /> : formatBytes(entry.size ?? 0)}
          </Row>
          {properties.children === null ? null : (
            <Row label="Contains">{plural(properties.children, 'item')}</Row>
          )}
          <Row label="Created">{formatFullDate(entry.created)}</Row>
          <Row label="Modified">{formatFullDate(entry.modified)}</Row>
          <Row label="Opened">{formatFullDate(properties.accessed)}</Row>
          <Row label="Permissions">
            <span className="font-mono">{properties.permissions}</span>
            {entry.readonly ? <span className="text-fg-muted"> · read only</span> : null}
            {entry.hidden ? <span className="text-fg-muted"> · hidden</span> : null}
          </Row>
          {properties.linkTarget === null ? null : (
            <Row label="Points to">
              <span className="break-all">{properties.linkTarget}</span>
            </Row>
          )}
        </dl>
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            leadingIcon="codicon:copy"
            onClick={() => api.copyText(entry.path, 'the path')}
          >
            Copy path
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leadingIcon="codicon:folder-opened"
            onClick={() => api.reveal(entry.path)}
          >
            Show in file manager
          </Button>
        </div>
      </DialogBody>
    </>
  );
}

function Row({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <>
      <dt className="text-fg-muted">{label}</dt>
      <dd className="min-w-0 cursor-text select-text text-fg tabular-nums">{children}</dd>
    </>
  );
}

/** Counts a folder's size in the background; stops when the dialog closes. */
function FolderSizeValue({ path }: { readonly path: string }) {
  const { backend } = useExplorer();
  const [size, setSize] = useState<Loaded<FolderSize>>({ status: 'loading' });

  useEffect(() => {
    counter += 1;
    const id = `size-${Date.now().toString(36)}-${counter}`;
    let active = true;
    backend.folderSize(id, path).then(
      (value) => {
        if (active) setSize({ status: 'ready', value });
      },
      (error: unknown) => {
        if (active) setSize({ status: 'error', message: errorMessage(error) });
      },
    );
    return () => {
      active = false;
      // The dialog closed first: stop counting (a finished task has nothing to cancel).
      backend.cancelTask(id).catch(() => undefined);
    };
  }, [backend, path]);

  if (size.status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 text-fg-muted">
        <Spinner size={12} decorative /> Counting…
      </span>
    );
  }
  if (size.status === 'error') return <span className="text-fg-muted">{size.message}</span>;
  const { bytes, files, folders } = size.value;
  return (
    <span>
      {formatBytes(bytes)}{' '}
      <span className="text-fg-muted">
        · {plural(files, 'file')}, {plural(folders, 'folder')}
      </span>
    </span>
  );
}
