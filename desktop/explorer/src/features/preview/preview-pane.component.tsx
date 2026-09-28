import {
  Badge,
  Button,
  type CodiconRef,
  Icon,
  IconButton,
  ScrollArea,
  Skeleton,
} from '@genslate/design-system';
import type { ReactNode } from 'react';

import { useExplorer } from '../../app/explorer.context';
import type { Entry } from '../../ipc/explorer.types';
import { entryIcon } from '../../model/file-icon.util';
import {
  formatBytes,
  formatDate,
  formatFullDate,
  kindLabel,
  plural,
} from '../../model/format.util';
import { baseName, parentOf } from '../../model/path.util';
import { PreviewMedia } from './preview-media.component';

/** The right-hand pane: the selection previewed, its details, and the AI summary to come. */
export function PreviewPane() {
  const api = useExplorer();
  const { selected } = api;
  const [single] = selected;

  return (
    <aside
      aria-label="Preview"
      data-context-zone="preview"
      className="flex h-full min-h-0 flex-col bg-surface-panel"
    >
      <div className="hairline-b flex h-panel-header shrink-0 items-center gap-2 pr-1 pl-4">
        <h2 className="flex-1 truncate font-semibold text-2xs text-fg-muted uppercase tracking-wider">
          Preview
        </h2>
        <IconButton
          size="xs"
          icon="codicon:close"
          label="Hide the preview pane"
          tooltipShortcut="alt+p"
          onClick={api.togglePreview}
        />
      </div>
      <ScrollArea className="min-h-0 flex-1" aria-label="Preview details">
        <div className="flex flex-col gap-4 p-4">
          {selected.length === 0 ? <FolderSummary /> : null}
          {selected.length === 1 && single !== undefined ? <SingleItem entry={single} /> : null}
          {selected.length > 1 ? <ManyItems entries={selected} /> : null}
          <AiSummary />
        </div>
      </ScrollArea>
    </aside>
  );
}

function Title({
  icon,
  title,
  subtitle,
}: {
  readonly icon: CodiconRef;
  readonly title: string;
  readonly subtitle: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-fill-hover text-fg-secondary">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <h3 className="break-words font-semibold text-fg-strong text-md leading-snug">{title}</h3>
        <p className="text-fg-muted text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

function Facts({ rows }: { readonly rows: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-fg-muted">{label}</dt>
          <dd className="min-w-0 cursor-text select-text break-words text-fg tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SingleItem({ entry }: { readonly entry: Entry }) {
  const api = useExplorer();
  const listing = entry.isDir ? api.listingOf(entry.path) : undefined;
  const count = listing?.listing?.entries.length;

  return (
    <>
      <Title
        icon={entryIcon(entry)}
        title={entry.name}
        subtitle={
          entry.isDir
            ? count === undefined
              ? 'Folder'
              : `Folder · ${plural(count, 'item')}`
            : `${kindLabel(entry)}${entry.size === null ? '' : ` · ${formatBytes(entry.size)}`}`
        }
      />
      {entry.isDir ? null : <PreviewMedia key={entry.path} entry={entry} />}
      <Facts
        rows={[
          ['Kind', kindLabel(entry)],
          ...(entry.isDir || entry.size === null
            ? []
            : [['Size', formatBytes(entry.size)] as const]),
          [
            'Modified',
            <span title={formatFullDate(entry.modified)}>{formatDate(entry.modified)}</span>,
          ],
          [
            'Created',
            <span title={formatFullDate(entry.created)}>{formatDate(entry.created)}</span>,
          ],
          ['Where', parentOf(entry.path) ?? entry.path],
          ...(entry.readonly ? [['Access', 'Read only'] as const] : []),
          ...(entry.symlink ? [['Link', 'Symbolic link'] as const] : []),
        ]}
      />
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={entry.isDir ? 'codicon:folder-opened' : 'codicon:link-external'}
          onClick={() => api.open(entry)}
        >
          Open
        </Button>
        <Button
          size="sm"
          variant="ghost"
          leadingIcon="codicon:info"
          onClick={() => api.openDialog({ type: 'properties', path: entry.path })}
        >
          Properties
        </Button>
      </div>
    </>
  );
}

function ManyItems({ entries }: { readonly entries: readonly Entry[] }) {
  const files = entries.filter((entry) => !entry.isDir);
  const folders = entries.length - files.length;
  const bytes = files.reduce((sum, entry) => sum + (entry.size ?? 0), 0);
  const kinds = new Map<string, number>();
  for (const entry of entries) kinds.set(kindLabel(entry), (kinds.get(kindLabel(entry)) ?? 0) + 1);

  return (
    <>
      <Title icon="codicon:files" title={plural(entries.length, 'item')} subtitle="selected" />
      <Facts
        rows={[
          [
            'Files',
            `${files.length.toLocaleString()}${files.length > 0 ? ` · ${formatBytes(bytes)}` : ''}`,
          ],
          ['Folders', folders.toLocaleString()],
          ...[...kinds.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([kind, count]) => [kind, count.toLocaleString()] as const),
        ]}
      />
    </>
  );
}

function FolderSummary() {
  const api = useExplorer();
  const entries = api.listing?.listing?.entries ?? [];
  const files = entries.filter((entry) => !entry.isDir);
  const bytes = files.reduce((sum, entry) => sum + (entry.size ?? 0), 0);
  const name = api.tab.search === null ? baseName(api.tab.path) : `Search results`;

  return (
    <>
      <Title
        icon={api.tab.search === null ? 'codicon:folder' : 'codicon:search'}
        title={name}
        subtitle={
          api.tab.search === null
            ? plural(entries.length, 'item')
            : plural(api.visible.length, 'match', 'matches')
        }
      />
      {api.tab.search === null ? (
        <Facts
          rows={[
            ['Folders', (entries.length - files.length).toLocaleString()],
            [
              'Files',
              `${files.length.toLocaleString()}${files.length > 0 ? ` · ${formatBytes(bytes)}` : ''}`,
            ],
            ['Path', api.tab.path],
          ]}
        />
      ) : null}
      <p className="text-fg-muted text-sm">Select a file to preview it here.</p>
    </>
  );
}

/** Reserved for the assistant: a summary, key facts and tags for the selection. */
function AiSummary() {
  return (
    <section
      aria-label="AI summary (coming soon)"
      className="flex flex-col gap-2.5 rounded-card border border-border-subtle bg-surface-raised p-3"
    >
      <div className="flex items-center gap-2">
        <Icon name="codicon:sparkle" className="text-accent-fg" />
        <h3 className="font-semibold text-fg-strong text-sm">AI summary</h3>
        <Badge tone="accent" size="sm" pill className="ml-auto">
          Coming soon
        </Badge>
      </div>
      <div aria-hidden className="flex flex-col gap-1.5 opacity-70">
        <Skeleton shape="text" animated={false} className="w-full" />
        <Skeleton shape="text" animated={false} className="w-11/12" />
        <Skeleton shape="text" animated={false} className="w-3/5" />
        <div className="mt-1 flex gap-1.5">
          <Skeleton animated={false} className="h-4 w-12 rounded-full" />
          <Skeleton animated={false} className="h-4 w-16 rounded-full" />
          <Skeleton animated={false} className="h-4 w-10 rounded-full" />
        </div>
      </div>
      <p className="text-fg-secondary text-xs leading-relaxed">
        A short summary, the key facts and suggested tags for any document, photo or folder.
      </p>
    </section>
  );
}
