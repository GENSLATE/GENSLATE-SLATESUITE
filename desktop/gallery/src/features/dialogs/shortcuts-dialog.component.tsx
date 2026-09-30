import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  Kbd,
} from '@genslate/design-system';

import { COMMANDS, type CommandGroup } from '../../app/commands.registry';
import { useGallery } from '../../app/gallery.context';

/** Keys the grid and the viewer handle themselves (not commands). */
const GRID_KEYS: readonly { keys: string; label: string }[] = [
  { keys: 'shift+right', label: 'Extend the selection' },
  { keys: 'space', label: 'Select or deselect' },
  { keys: 'escape', label: 'Clear the selection' },
];

const VIEWER_KEYS: readonly { keys: string; label: string }[] = [
  { keys: 'left', label: 'Previous photo' },
  { keys: 'right', label: 'Next photo' },
  { keys: '+', label: 'Zoom in' },
  { keys: '-', label: 'Zoom out' },
  { keys: 'escape', label: 'Back to the photos' },
];

const GROUPS: readonly CommandGroup[] = ['Photo', 'Edit', 'Library', 'View', 'Go', 'AI', 'Help'];

/** Every shortcut, grouped. */
export function ShortcutsDialog() {
  const api = useGallery();
  const bound = COMMANDS.filter(
    (entry) => entry.shortcut !== undefined && entry.soon !== true && !entry.id.startsWith('rate-'),
  );

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="lg" showClose>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogBody className="columns-2 gap-8">
          {GROUPS.map((group) => {
            const rows = bound.filter((entry) => entry.group === group);
            if (rows.length === 0) return null;
            return (
              <Section
                key={group}
                title={group}
                rows={[
                  ...rows.map((entry) => ({ keys: entry.shortcut ?? '', label: entry.label })),
                  ...(group === 'Photo'
                    ? [{ keys: '1', label: 'Rate 1 to 5 stars (0 clears)' }]
                    : []),
                ]}
              />
            );
          })}
          <Section title="In the grid" rows={GRID_KEYS} />
          <Section title="In the viewer" rows={VIEWER_KEYS} />
        </DialogBody>
        <DialogFooter>
          <DialogClose tone="primary">Done</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function Section({
  title,
  rows,
}: {
  readonly title: string;
  readonly rows: readonly { keys: string; label: string }[];
}) {
  return (
    <section className="mb-4 break-inside-avoid">
      <h3 className="mb-1.5 font-semibold text-2xs text-fg-muted uppercase tracking-wider">
        {title}
      </h3>
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div key={row.label} className="flex h-row-md items-center gap-3 text-sm">
            <dt className="flex-1 truncate text-fg">{row.label}</dt>
            <dd>
              <Kbd shortcut={row.keys} size="sm" />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
