import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  Kbd,
  usePlatform,
} from '@genslate/design-system';

import { COMMANDS, type CommandGroup, shortcutFor } from '../../app/commands.registry';
import { useTerminal } from '../../app/terminal.context';

/** Keys the terminal handles itself (not commands). */
const TERMINAL_KEYS: readonly { keys: string; label: string }[] = [
  { keys: 'mod+c', label: 'Copy the selection, else interrupt' },
  { keys: 'mod+v', label: 'Paste' },
  { keys: 'shift+pageup', label: 'Scroll up a page' },
  { keys: 'mod+click', label: 'Open the link or path under the pointer' },
  { keys: '#', label: 'At an empty prompt: describe a command' },
  { keys: 'alt+click', label: 'In the shell menu: split instead of a tab' },
];

const GROUPS: readonly CommandGroup[] = ['Tabs', 'Panes', 'Shell', 'Edit', 'View', 'AI', 'Help'];

/** Every shortcut, grouped, for this platform. */
export function ShortcutsDialog() {
  const api = useTerminal();
  const platform = usePlatform();
  const rows = (group: CommandGroup) =>
    COMMANDS.flatMap((entry) => {
      const keys = shortcutFor(entry, platform);
      if (entry.group !== group || keys === undefined || entry.soon === true) return [];
      const label = entry.hidden === true ? numberedLabel(entry.id) : entry.label;
      if (label === null) return [];
      return [{ keys: entry.hidden === true ? keys.replace(/\d$/, '1…9') : keys, label }];
    });

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="lg" showClose>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogBody className="columns-2 gap-8">
          {GROUPS.map((group) => {
            const list = rows(group);
            return list.length === 0 ? null : <Section key={group} title={group} rows={list} />;
          })}
          <Section title="In the terminal" rows={TERMINAL_KEYS} />
        </DialogBody>
        <DialogFooter>
          <DialogClose tone="primary">Done</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

/** The numbered commands appear once, as a range. */
function numberedLabel(id: string): string | null {
  if (id === 'new-tab-1') return 'New tab with shell 1–9';
  if (id === 'go-to-tab-1') return 'Go to tab 1–9';
  return null;
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
