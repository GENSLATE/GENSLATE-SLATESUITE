import { Avatar, type CodiconRef, cn, Icon, Kbd } from '@genslate/design-system';
import type { CSSProperties } from 'react';
import { AppIcon } from '../../components/app-icon.component';
import { BrandMark } from '../../components/brand-mark.component';
import { findApp, type SuiteApp } from '../../content/apps.content';

interface Group {
  readonly title: string;
  readonly icon?: CodiconRef;
  readonly apps: readonly string[];
}

const GROUPS: readonly Group[] = [
  { title: 'Favorites', icon: 'codicon:star-full', apps: ['explorer', 'terminal', 'coder'] },
  { title: 'Recent', icon: 'codicon:history', apps: ['editor'] },
  { title: 'Media', apps: ['gallery', 'jukebox', 'theater'] },
  { title: 'Utilities', apps: ['command', 'toolbox'] },
];

const FOLDERS: readonly { label: string; icon: CodiconRef }[] = [
  { label: 'Desktop', icon: 'codicon:device-desktop' },
  { label: 'Documents', icon: 'codicon:file' },
  { label: 'Downloads', icon: 'codicon:cloud-download' },
  { label: 'Music', icon: 'codicon:unmute' },
  { label: 'Pictures', icon: 'codicon:file-media' },
  { label: 'Videos', icon: 'codicon:device-camera-video' },
];

const RUNNING = new Set(['explorer', 'editor']);

function Row({ app }: { readonly app: SuiteApp }) {
  return (
    <div className="relative z-10 flex h-11 items-center gap-2.5 rounded-lg px-2">
      <span className="relative shrink-0">
        <AppIcon app={app} size={28} />
        {RUNNING.has(app.id) ? (
          <span className="absolute -right-0.5 -bottom-0.5 grid size-2.5 place-items-center rounded-full bg-surface-sunken">
            <span className="size-1.5 rounded-full bg-accent" />
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-base text-fg-strong">{app.name}</span>
        <span className="truncate text-fg-muted text-xs">{app.tagline}</span>
      </span>
    </div>
  );
}

/** The GENSLATE Launcher: bezel frame, recessed apps well, documents rail, command bar. */
export function LauncherMockup({ className }: { readonly className?: string }) {
  return (
    <div
      className={cn(
        'mock-window grid size-full grid-cols-[minmax(0,1fr)_152px] grid-rows-[40px_minmax(0,1fr)_48px_26px] overflow-hidden rounded-window bg-surface-raised text-fg',
        className,
      )}
    >
      {/* Titlebar */}
      <div className="col-span-2 flex items-center gap-2 px-3.5">
        <BrandMark className="size-[18px]" />
        <span className="font-semibold text-[12px] text-fg-strong tracking-[0.14em]">GENSLATE</span>
        <span className="text-fg-muted text-md">Launcher</span>
        <span className="ml-auto flex items-center gap-3 text-fg-muted">
          <Icon name="codicon:pinned" size={14} />
          <Icon name="codicon:chrome-minimize" size={14} />
          <Icon name="codicon:chrome-close" size={14} />
        </span>
      </div>

      {/* Well */}
      <div className="relative ml-2 flex min-h-0 flex-col overflow-hidden rounded-lg bg-surface-sunken p-1.5 shadow-inset">
        <div className="grid grid-cols-[1.9fr_1fr_1fr] gap-0.5 rounded-lg bg-fill-hover p-0.5 text-sm">
          <span className="flex h-7 items-center justify-center gap-1.5 rounded-md bg-surface-raised font-medium text-fg-strong shadow-control">
            <Icon name="codicon:layers" size={14} />
            GENSLATE <span className="text-fg-muted tabular-nums">12</span>
          </span>
          <span className="flex items-center justify-center gap-1.5 text-fg-muted">
            <Icon name="codicon:package" size={14} />6
          </span>
          <span className="flex items-center justify-center gap-1.5 text-fg-muted">
            <Icon name="codicon:archive" size={14} />2
          </span>
        </div>

        <div className="relative mt-1 flex-1 overflow-hidden">
          {GROUPS.map((group, groupIndex) => (
            <div key={group.title} className={cn(groupIndex > 0 && 'mt-1')}>
              <div className="flex h-7 items-center gap-1.5 px-2 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
                <Icon name="codicon:chevron-down" size={12} />
                {group.icon ? <Icon name={group.icon} size={12} /> : null}
                {group.title}
                <span className="ml-auto tabular-nums">{group.apps.length}</span>
              </div>
              <div className="relative">
                {groupIndex === 0 ? (
                  <div
                    className="mock-highlight absolute inset-x-0 top-0 h-11 rounded-lg bg-fill-hover"
                    style={{ '--row-step': '44px' } as CSSProperties}
                  >
                    <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1 text-fg-muted">
                      <Icon name="codicon:star-full" size={12} className="text-accent-fg" />
                      <Icon name="codicon:chevron-right" size={14} />
                    </span>
                  </div>
                ) : null}
                {group.apps.map((id) => {
                  const app = findApp(id);
                  return app ? <Row key={id} app={app} /> : null;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documents rail */}
      <div className="flex min-h-0 flex-col items-center px-3 pt-4">
        <Avatar name="Shared" size="xl" />
        <span className="mt-2 font-semibold text-fg-strong text-md">Shared</span>
        <span className="mt-0.5 text-2xs text-fg-muted uppercase tracking-[0.08em]">
          GENSLATE-USB
        </span>
        <div className="mt-6 w-full">
          <span className="px-1 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
            Folders
          </span>
          <ul className="mt-1.5 grid gap-0.5">
            {FOLDERS.map((folder) => (
              <li
                key={folder.label}
                className="flex h-7 items-center gap-2 rounded-md px-1 text-fg text-md"
              >
                <Icon name={folder.icon} size={14} className="text-fg-muted" />
                {folder.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Command bar */}
      <div className="flex items-center pl-2">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-accent-border bg-field px-2.5 shadow-[0_0_0_3px_var(--gs-color-focus-halo)]">
          <Icon name="codicon:search" size={14} className="text-fg-muted" />
          <span className="font-mono text-fg-strong text-md">
            <span
              className="mock-type inline-block"
              style={
                {
                  '--type-steps': 4,
                  '--type-duration': '0.9s',
                  '--type-delay': '1.2s',
                } as CSSProperties
              }
            >
              /ope
            </span>
            <span className="mock-caret ml-px inline-block h-4 w-px translate-y-0.5 bg-accent" />
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Kbd shortcut="mod+k" size="sm" platform="windows" />
            <Icon name="codicon:sparkle" size={14} className="text-accent-fg" />
          </span>
        </div>
      </div>
      <div className="flex items-center px-2">
        <span className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-raised text-fg text-md shadow-control">
          <Icon name="codicon:tools" size={14} />
          Tools
        </span>
      </div>

      {/* Status bar */}
      <div className="col-span-2 flex items-center gap-2 px-3 text-fg-muted text-xs">
        <Icon name="codicon:database" size={12} />
        <span className="font-semibold text-fg">D:</span>
        <span className="h-1 w-16 overflow-hidden rounded-full bg-track">
          <span className="block h-full w-[38%] rounded-full bg-accent" />
        </span>
        <span className="tabular-nums">62% free · 99.4 GB / 161 GB</span>
        <span className="ml-auto tabular-nums">
          CPU <span className="text-fg">52°</span>
        </span>
        <span className="tabular-nums">
          GPU <span className="text-fg">55°</span>
        </span>
      </div>
    </div>
  );
}
