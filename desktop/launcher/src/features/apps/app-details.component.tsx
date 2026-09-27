import { Badge, Button, TextField } from '@genslate/design-system';
import { useState } from 'react';

import type { AppEntry, AppStatus } from '../../ipc/launcher.types';
import { WellSheet } from '../tools/well-sheet.component';
import { AppIcon } from './app-icon.component';
import { isLaunchable, sourceOf } from './catalog.model';

const SOURCE_NAME = {
  genslate: 'GENSLATE',
  portableapps: 'PortableApps.com',
  portapps: 'portapps.io',
} as const;

const STATUS: Record<
  AppStatus,
  { label: string; tone: 'success' | 'accent' | 'neutral' | 'warning' | 'danger' }
> = {
  ready: { label: 'Ready', tone: 'success' },
  running: { label: 'Running', tone: 'accent' },
  'not-installed': { label: 'Not installed', tone: 'neutral' },
  'missing-exe': { label: 'Program missing', tone: 'warning' },
  'broken-manifest': { label: 'Metadata unreadable', tone: 'danger' },
};

export interface AppDetailsProps {
  readonly app: AppEntry;
  readonly onBack: () => void;
  readonly onLaunch: () => void;
  readonly onOpenFolder: () => void;
  readonly onToggleFavorite: () => void;
}

/** Properties of one app. */
export function AppDetails({
  app,
  onBack,
  onLaunch,
  onOpenFolder,
  onToggleFavorite,
}: AppDetailsProps) {
  const status = STATUS[app.status];
  const rows: readonly (readonly [string, string | null])[] = [
    ['Source', SOURCE_NAME[sourceOf(app.id)]],
    ['Category', app.category || null],
    ['Version', app.version],
    ['Publisher', app.publisher],
    ['Arguments', app.args.length > 0 ? app.args.join(' ') : null],
    ['Id', app.id],
  ];
  return (
    <WellSheet title="Properties" onBack={onBack}>
      <div className="flex items-center gap-3">
        <AppIcon app={app} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-semibold text-fg-strong text-md">{app.name}</span>
          <Badge tone={status.tone} size="sm" dot className="self-start">
            {status.label}
          </Badge>
        </div>
      </div>
      {app.description === '' ? null : (
        <p className="mt-3 text-fg-secondary text-sm">{app.description}</p>
      )}
      <dl className="mt-3 flex flex-col divide-y divide-border-subtle">
        {rows
          .filter((row): row is readonly [string, string] => row[1] !== null)
          .map(([label, value]) => (
            <div key={label} className="flex min-h-7 items-center gap-3 py-1 text-sm">
              <dt className="w-20 shrink-0 text-fg-muted">{label}</dt>
              <dd className="min-w-0 break-words text-fg">{value}</dd>
            </div>
          ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          leadingIcon="codicon:play"
          disabled={!isLaunchable(app)}
          onClick={onLaunch}
        >
          Open
        </Button>
        <Button size="sm" leadingIcon="codicon:folder-opened" onClick={onOpenFolder}>
          Folder
        </Button>
        <Button
          size="sm"
          variant="ghost"
          leadingIcon={app.favorite ? 'codicon:star-full' : 'codicon:star-empty'}
          onClick={onToggleFavorite}
        >
          {app.favorite ? 'Unfavorite' : 'Favorite'}
        </Button>
      </div>
    </WellSheet>
  );
}

export interface RunWithArgsProps {
  readonly app: AppEntry;
  readonly onBack: () => void;
  readonly onRun: (args: readonly string[]) => void;
}

/** Launch once with custom arguments (quotes group words: `--title "My file"`). */
export function RunWithArgs({ app, onBack, onRun }: RunWithArgsProps) {
  const [text, setText] = useState(app.args.join(' '));
  return (
    <WellSheet title="Run with arguments" onBack={onBack}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onRun(splitArgs(text));
        }}
      >
        <div className="flex items-center gap-2.5">
          <AppIcon app={app} />
          <span className="truncate font-medium text-base text-fg-strong">{app.name}</span>
        </div>
        <TextField
          label="Arguments"
          placeholder="--flag value"
          value={text}
          autoFocus
          onChange={(event) => setText(event.target.value)}
          className="font-mono"
        />
        <p className="text-fg-muted text-xs">
          Used for this launch only. To keep them, set args in the tab's settings file.
        </p>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="sm" leadingIcon="codicon:play">
            Run
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onBack}>
            Cancel
          </Button>
        </div>
      </form>
    </WellSheet>
  );
}

/** Splits a command line into arguments; double or single quotes group words. */
export function splitArgs(text: string): string[] {
  const args: string[] = [];
  for (const match of text.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)) {
    args.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return args;
}
