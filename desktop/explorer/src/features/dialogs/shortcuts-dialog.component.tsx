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
import { useExplorer } from '../../app/explorer.context';

/** Keys the file list handles itself (not commands). */
const LIST_KEYS: readonly { keys: string; label: string }[] = [
  { keys: 'enter', label: 'Open' },
  { keys: 'mod+enter', label: 'Open folder in a new tab' },
  { keys: 'backspace', label: 'Back' },
  { keys: 'shift+down', label: 'Extend the selection' },
  { keys: 'mod+space', label: 'Select or deselect' },
  { keys: 'escape', label: 'Clear the filter or selection' },
];

const GROUPS: readonly CommandGroup[] = ['File', 'Edit', 'Go', 'View', 'Tabs', 'AI', 'Help'];

/** Every shortcut, grouped. */
export function ShortcutsDialog() {
  const api = useExplorer();
  const bound = COMMANDS.filter((entry) => entry.shortcut !== undefined && entry.soon !== true);

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
                rows={rows.map((entry) => ({ keys: entry.shortcut ?? '', label: entry.label }))}
              />
            );
          })}
          <Section title="In the file list" rows={LIST_KEYS} />
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
