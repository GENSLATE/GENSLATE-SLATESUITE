import { type CodiconRef, Icon, ScrollArea } from '@genslate/design-system';

import { TeaserHero } from './teaser.component';

const SMART_FOLDERS: readonly { icon: CodiconRef; name: string; hint: string }[] = [
  { icon: 'codicon:device-camera', name: 'Screenshots', hint: 'Every screenshot, newest first' },
  { icon: 'codicon:graph', name: 'Large files', hint: 'Over 500 MB, anywhere' },
  { icon: 'codicon:files', name: 'Duplicates', hint: 'Same content, different places' },
  {
    icon: 'codicon:credit-card',
    name: 'Receipts and invoices',
    hint: 'Read from the documents themselves',
  },
  { icon: 'codicon:location', name: 'Trips', hint: 'Photos grouped by place and date' },
];

/** The Smart tab, a preview: saved searches that keep themselves up to date. */
export function SmartPanel() {
  return (
    <ScrollArea className="min-h-0 flex-1" aria-label="Smart folders">
      <TeaserHero icon="codicon:sparkle" title="Smart folders">
        Folders that fill themselves: describe what belongs in one and the assistant keeps it up to
        date, without moving your files.
      </TeaserHero>
      <ul className="flex flex-col gap-px px-2 pb-4">
        {SMART_FOLDERS.map((folder) => (
          <li key={folder.name}>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="flex h-11 w-full items-center gap-2 rounded-control px-2 text-left disabled:cursor-not-allowed"
            >
              <Icon name={folder.icon} className="text-fg-muted" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base text-fg-secondary">{folder.name}</span>
                <span className="truncate text-fg-muted text-xs">{folder.hint}</span>
              </span>
              <Icon name="codicon:lock-small" size={14} className="text-fg-disabled" />
            </button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
