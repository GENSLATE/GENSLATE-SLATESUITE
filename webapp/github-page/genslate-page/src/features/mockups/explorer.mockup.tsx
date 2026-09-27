import {
  Breadcrumbs,
  type CodiconRef,
  cn,
  Icon,
  SegmentedControl,
  SegmentedControlItem,
  StatusBar,
  StatusBarItem,
  StatusBarSection,
} from '@genslate/design-system';

import { Artwork, Glyph } from './mock-parts.component';
import { MockWindow } from './mock-stage.component';

const PLACES: readonly { label: string; icon: CodiconRef; selected?: boolean }[] = [
  { label: 'Desktop', icon: 'codicon:vm' },
  { label: 'Documents', icon: 'codicon:file-text' },
  { label: 'Downloads', icon: 'codicon:cloud-download' },
  { label: 'Music', icon: 'codicon:unmute' },
  { label: 'Pictures', icon: 'codicon:file-media', selected: true },
  { label: 'Videos', icon: 'codicon:device-camera-video' },
];

const LOCATIONS: readonly { label: string; icon: CodiconRef; detail: string }[] = [
  { label: 'GENSLATE-USB', icon: 'codicon:database', detail: '62%' },
  { label: 'This PC', icon: 'codicon:vm', detail: '' },
  { label: 'Network', icon: 'codicon:globe', detail: '' },
];

const TAGS = ['--gs-nord-11', '--gs-nord-13', '--gs-nord-14', '--gs-nord-8'] as const;

const FILES = [
  { name: 'Lofoten', kind: 'art', seed: 1 },
  { name: 'Aurora over Tromsø', kind: 'art', seed: 2, selected: true },
  { name: 'Fjord at dusk', kind: 'art', seed: 0 },
  { name: 'Birch forest', kind: 'art', seed: 3 },
  { name: 'Screenshots', kind: 'folder', seed: 0 },
  { name: 'Wallpapers', kind: 'folder', seed: 0 },
  { name: 'Salt flats', kind: 'art', seed: 4 },
  { name: 'Night drive', kind: 'art', seed: 5 },
] as const;

function SidebarRow({
  icon,
  label,
  selected,
  detail,
}: {
  readonly icon: CodiconRef;
  readonly label: string;
  readonly selected?: boolean;
  readonly detail?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-7 items-center gap-2 rounded-md px-2 text-md',
        selected ? 'bg-selection text-fg-strong' : 'text-fg',
      )}
    >
      <Icon name={icon} size={16} className={selected ? 'text-accent-fg' : 'text-fg-muted'} />
      <span className="flex-1">{label}</span>
      {detail ? <span className="text-fg-muted text-xs tabular-nums">{detail}</span> : null}
    </div>
  );
}

/** Explorer: source-list sidebar, breadcrumbs toolbar, icon grid and a quick-look inspector. */
export function ExplorerMockup() {
  return (
    <MockWindow
      title="Pictures"
      statusBar={
        <StatusBar>
          <StatusBarSection>
            <StatusBarItem icon="codicon:files">8 items</StatusBarItem>
            <StatusBarItem>1 selected · 4.2 MB</StatusBarItem>
          </StatusBarSection>
          <StatusBarSection align="end">
            <StatusBarItem icon="codicon:database">GENSLATE-USB · 99.4 GB free</StatusBarItem>
          </StatusBarSection>
        </StatusBar>
      }
    >
      <div className="hairline-r flex w-[216px] shrink-0 flex-col gap-4 bg-surface-sidebar px-2 pt-3">
        <div>
          <p className="mb-1 px-2 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
            Favorites
          </p>
          {PLACES.map((place) => (
            <SidebarRow key={place.label} {...place} />
          ))}
        </div>
        <div>
          <p className="mb-1 px-2 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
            Locations
          </p>
          {LOCATIONS.map((location) => (
            <SidebarRow key={location.label} {...location} />
          ))}
        </div>
        <div>
          <p className="mb-1 px-2 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
            Tags
          </p>
          {TAGS.map((tag, index) => (
            <div key={tag} className="flex h-7 items-center gap-2.5 px-2.5 text-fg text-md">
              <span className="size-2.5 rounded-full" style={{ background: `var(${tag})` }} />
              {['Important', 'Travel', 'Edited', 'Shared'][index]}
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hairline-b flex h-11 shrink-0 items-center gap-3 px-3">
          <span className="flex gap-1 text-fg-muted">
            <Icon name="codicon:arrow-left" size={16} />
            <Icon name="codicon:arrow-right" size={16} className="opacity-40" />
          </span>
          <Breadcrumbs
            size="md"
            items={[
              { id: 'usb', label: 'GENSLATE-USB', icon: 'codicon:database' },
              { id: 'storage', label: 'storage' },
              { id: 'shared', label: 'shared' },
              { id: 'pictures', label: 'Pictures' },
            ]}
          />
          <span className="ml-auto">
            <SegmentedControl size="sm" defaultValue="grid" aria-label="View">
              <SegmentedControlItem value="grid" icon="codicon:layout" label="Grid" />
              <SegmentedControlItem value="list" icon="codicon:list-flat" label="List" />
              <SegmentedControlItem value="tree" icon="codicon:list-tree" label="Tree" />
            </SegmentedControl>
          </span>
          <span className="flex h-7 w-44 items-center gap-2 rounded-control border border-border bg-field px-2 text-fg-muted text-sm">
            <Icon name="codicon:search" size={14} />
            Search Pictures
          </span>
        </div>

        <div className="grid flex-1 grid-cols-4 content-start gap-x-3 gap-y-4 p-4">
          {FILES.map((file) => (
            <div key={file.name} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'grid aspect-[4/3] w-full place-items-center rounded-lg p-1.5',
                  'selected' in file && file.selected && 'bg-selection',
                )}
              >
                {file.kind === 'folder' ? (
                  <Glyph name="folder" color="--gs-nord-8" size={72} />
                ) : (
                  <Artwork seed={file.seed} className="size-full rounded-md shadow-card" />
                )}
              </div>
              <span
                className={cn(
                  'max-w-full truncate rounded px-1.5 text-center text-sm',
                  'selected' in file && file.selected ? 'bg-accent text-on-accent' : 'text-fg',
                )}
              >
                {file.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="hairline-l flex w-[248px] shrink-0 flex-col gap-3 bg-surface-sidebar p-4">
        <Artwork seed={2} className="aspect-[4/3] w-full rounded-lg shadow-card" />
        <div>
          <p className="font-semibold text-fg-strong text-md">Aurora over Tromsø.jpg</p>
          <p className="text-fg-muted text-sm">JPEG image · 4.2 MB</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          {[
            ['Dimensions', '6000 × 4000'],
            ['Camera', 'X-T5 · 23mm f/2'],
            ['Created', '12 Feb 2026, 21:47'],
            ['Where', 'storage/shared/Pictures'],
          ].map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="text-fg-muted">{term}</dt>
              <dd className="truncate text-fg">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {['Travel', 'Night', 'Norway'].map((tag) => (
            <span key={tag} className="rounded-full bg-fill-hover px-2 py-0.5 text-fg text-xs">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </MockWindow>
  );
}
