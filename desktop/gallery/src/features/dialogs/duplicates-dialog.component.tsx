import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  EmptyState,
  ProgressBar,
  ScrollArea,
} from '@genslate/design-system';
import { useEffect, useState } from 'react';

import { useGallery } from '../../app/gallery.context';
import type { DuplicateGroup, MediaItem } from '../../ipc/gallery.types';
import { formatBytes, formatDimensions, plural } from '../../model/format.util';
import { MediaThumb } from '../library/media-thumb.component';

/** The items behind `ids`: from the current list when there, else read from the library. */
function useItems(ids: readonly number[]): ReadonlyMap<number, MediaItem> {
  const api = useGallery();
  const [fetched, setFetched] = useState<ReadonlyMap<number, MediaItem>>(new Map());
  const missing = ids.filter((id) => api.itemById(id) === undefined && !fetched.has(id));
  const missingKey = missing.join(',');

  useEffect(() => {
    if (missingKey === '') return;
    let active = true;
    const wanted = missingKey.split(',').map(Number);
    Promise.allSettled(wanted.map((id) => api.backend.details(id))).then((results) => {
      if (!active) return;
      setFetched((current) => {
        const next = new Map(current);
        for (const result of results) {
          if (result.status === 'fulfilled') next.set(result.value.id, result.value);
        }
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [api.backend, missingKey]);

  const found = new Map<number, MediaItem>();
  for (const id of ids) {
    const item = api.itemById(id) ?? fetched.get(id);
    if (item !== undefined) found.set(id, item);
  }
  return found;
}

/**
 * Finds exact copies (same bytes) and near-duplicates (bursts and resaves, by perceptual hash)
 * across the library, keeps the largest of each group and offers to trash the rest.
 */
export function DuplicatesDialog() {
  const api = useGallery();
  const { duplicates } = api;
  const task =
    duplicates.status === 'running'
      ? api.tasks.find((entry) => entry.id === duplicates.id)
      : undefined;
  const groups = duplicates.status === 'done' ? duplicates.groups : [];
  const extras = groups.flatMap((group) => group.ids.slice(1));
  const reclaimable = groups.reduce((sum, group) => sum + group.reclaimable, 0);

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="lg" showClose>
        <DialogTitle>Duplicates</DialogTitle>
        <DialogDescription>
          Exact copies and look-alike shots. Gallery keeps the largest of each and suggests the rest
          for the Trash.
        </DialogDescription>
        <DialogBody className="flex min-h-64 flex-col">
          {duplicates.status === 'running' ? (
            <div className="flex flex-1 flex-col justify-center gap-3 px-6">
              <ProgressBar
                label="Comparing photos"
                showValue
                value={
                  task === undefined || task.total === 0 ? null : (task.done / task.total) * 100
                }
              />
              <p className="text-fg-muted text-sm">
                {task === undefined || task.total === 0
                  ? 'Reading the library…'
                  : `${task.done.toLocaleString()} of ${task.total.toLocaleString()} checked`}
              </p>
            </div>
          ) : null}
          {duplicates.status === 'done' && groups.length === 0 ? (
            <EmptyState
              className="flex-1"
              icon="codicon:pass"
              title="No duplicates"
              description="Every photo in your library is one of a kind."
            />
          ) : null}
          {groups.length > 0 ? (
            <ScrollArea className="max-h-[50vh] min-h-0 flex-1" aria-label="Duplicate groups">
              <ul className="flex flex-col gap-2 pr-2">
                {groups.map((group) => (
                  <Group key={group.ids.join('-')} group={group} />
                ))}
              </ul>
            </ScrollArea>
          ) : null}
        </DialogBody>
        <DialogFooter>
          {duplicates.status === 'running' ? (
            <DialogClose onClick={() => api.cancelTask(duplicates.id)}>Stop</DialogClose>
          ) : (
            <Button
              size="md"
              variant="ghost"
              leadingIcon="codicon:refresh"
              onClick={api.findDuplicates}
            >
              Search again
            </Button>
          )}
          <span className="flex-1" />
          <DialogClose>Close</DialogClose>
          <DialogClose
            tone="primary"
            disabled={extras.length === 0}
            onClick={() => api.trash(extras, true)}
          >
            {extras.length === 0
              ? 'Move extras to Trash'
              : `Move ${plural(extras.length, 'extra')} to Trash · ${formatBytes(reclaimable)}`}
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function Group({ group }: { readonly group: DuplicateGroup }) {
  const items = useItems(group.ids);
  return (
    <li className="flex items-center gap-3 rounded-card border border-border-subtle p-2">
      <div className="flex min-w-0 flex-1 gap-2 overflow-hidden">
        {group.ids.map((id, index) => {
          const item = items.get(id);
          return (
            <figure key={id} className="flex w-24 shrink-0 flex-col gap-1">
              <div className="relative aspect-square overflow-hidden rounded-sm bg-surface-sunken">
                {item === undefined ? null : <MediaThumb item={item} />}
                <span className="absolute top-1 left-1">
                  <Badge tone={index === 0 ? 'success' : 'neutral'} variant="solid" size="sm">
                    {index === 0 ? 'Keep' : 'Extra'}
                  </Badge>
                </span>
              </div>
              <figcaption className="truncate text-2xs text-fg-muted tabular-nums">
                {item === undefined
                  ? '…'
                  : (formatDimensions(item.width, item.height)?.split(' · ')[0] ??
                    formatBytes(item.size))}
              </figcaption>
            </figure>
          );
        })}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <Badge tone={group.likeness === 'exact' ? 'info' : 'accent'} size="sm" pill>
          {group.likeness === 'exact' ? 'Exact copies' : 'Look-alikes'}
        </Badge>
        <span className="text-fg-muted text-xs tabular-nums">
          {formatBytes(group.reclaimable)} to free
        </span>
      </div>
    </li>
  );
}
