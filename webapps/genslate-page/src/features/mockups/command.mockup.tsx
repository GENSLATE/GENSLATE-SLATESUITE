import { Badge, type CodiconRef, cn, Icon, Kbd } from '@genslate/design-system';

import { AppIcon } from '../../components/app-icon.component';
import { findApp } from '../../content/apps.content';

interface Result {
  readonly label: string;
  readonly detail: string;
  readonly icon?: CodiconRef;
  readonly app?: string;
  readonly active?: boolean;
}

const GROUPS: readonly { title: string; results: readonly Result[] }[] = [
  {
    title: 'Automations',
    results: [
      {
        label: 'Rename photos by date',
        detail: 'Command · 3 steps',
        icon: 'codicon:run-all',
        active: true,
      },
      { label: 'Resize for the web', detail: 'Command · 2 steps', icon: 'codicon:run-all' },
    ],
  },
  {
    title: 'Actions',
    results: [
      { label: 'Batch rename…', detail: 'Explorer', app: 'explorer' },
      { label: 'Open Pictures', detail: 'Explorer', app: 'explorer' },
      { label: 'Browse photos', detail: 'Gallery', app: 'gallery' },
    ],
  },
];

const STEPS = [
  {
    icon: 'codicon:folder-opened',
    title: 'Pick a folder',
    detail: 'storage/shared/Pictures/Norway 2026',
  },
  {
    icon: 'codicon:calendar',
    title: 'Read the date taken',
    detail: 'EXIF · falls back to modified time',
  },
  { icon: 'codicon:edit', title: 'Rename', detail: '{date:yyyy-MM-dd}-{n:000}.{ext}' },
] as const;

/** Command: one bar for automations and every app's actions, with a step preview. */
export function CommandMockup() {
  return (
    <div className="mock-window flex size-full flex-col overflow-hidden rounded-dialog bg-surface-popover text-fg">
      <div className="hairline-b flex h-14 shrink-0 items-center gap-3 px-5">
        <Icon name="codicon:terminal-cmd" size={20} className="text-accent-fg" />
        <span className="text-[17px] text-fg-strong">
          rename photos
          <span className="mock-caret ml-0.5 inline-block h-5 w-px translate-y-1 bg-accent" />
        </span>
        <span className="ml-auto flex items-center gap-2">
          <Badge tone="accent" size="sm">
            = 126 photos
          </Badge>
          <Kbd shortcut="alt+space" size="sm" platform="macos" />
        </span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hairline-r w-[420px] shrink-0 overflow-hidden p-2">
          {GROUPS.map((group) => (
            <div key={group.title} className="mb-2">
              <p className="px-3 py-1.5 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
                {group.title}
              </p>
              {group.results.map((result) => {
                const app = result.app ? findApp(result.app) : undefined;
                return (
                  <div
                    key={result.label}
                    className={cn(
                      'flex h-11 items-center gap-3 rounded-lg px-3',
                      result.active ? 'bg-selection' : '',
                    )}
                  >
                    {app ? (
                      <AppIcon app={app} size={24} />
                    ) : (
                      <span className="grid size-6 place-items-center rounded-md bg-accent-subtle text-accent-fg">
                        <Icon name={result.icon ?? 'codicon:circle'} size={14} />
                      </span>
                    )}
                    <span className="flex-1 truncate text-fg-strong text-md">{result.label}</span>
                    <span className="text-fg-muted text-sm">{result.detail}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-5">
          <p className="font-semibold text-fg-strong text-lg">Rename photos by date</p>
          <p className="mt-1 text-fg-muted text-sm">
            Saved in other/config/genslate/command/automations.toml
          </p>
          <ol className="mt-5 grid gap-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="relative flex flex-col items-center">
                  <span className="grid size-7 place-items-center rounded-full border border-accent-border bg-accent-subtle text-accent-fg">
                    <Icon name={step.icon} size={14} />
                  </span>
                  {index < STEPS.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-border" />
                  ) : null}
                </span>
                <span className="pb-2">
                  <span className="block font-medium text-fg-strong text-md">{step.title}</span>
                  <span className="block font-mono text-fg-muted text-xs">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-auto flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2 text-sm">
            <span className="text-fg-muted">
              Preview: <span className="font-mono text-fg">2026-02-14-001.jpg</span>
            </span>
            <span className="flex items-center gap-1.5 text-fg">
              Run <Kbd shortcut="enter" size="sm" platform="macos" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
