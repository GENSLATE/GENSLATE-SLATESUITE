import {
  Button,
  type CodiconRef,
  cn,
  Icon,
  StatusBar,
  StatusBarItem,
  StatusBarSection,
} from '@genslate/design-system';

import type { ReactNode } from 'react';

import { CodeLines } from './mock-parts.component';
import { MockWindow } from './mock-stage.component';

const TOOLS: readonly { label: string; icon: CodiconRef; active?: boolean }[] = [
  { label: 'JSON formatter', icon: 'codicon:bracket-dot' },
  { label: 'TOML ⇄ JSON', icon: 'codicon:arrow-swap', active: true },
  { label: 'Regex lab', icon: 'codicon:regex' },
  { label: 'Hash', icon: 'codicon:key' },
  { label: 'Base64', icon: 'codicon:symbol-string' },
  { label: 'UUID', icon: 'codicon:symbol-numeric' },
  { label: 'Colour picker', icon: 'codicon:symbol-color' },
  { label: 'Timestamps', icon: 'codicon:watch' },
];

function Pane({
  title,
  badge,
  children,
}: {
  readonly title: string;
  readonly badge: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-sunken">
      <div className="hairline-b flex h-9 items-center gap-2 px-3 text-sm">
        <span className="font-medium text-fg-strong">{title}</span>
        <span className="rounded bg-fill-hover px-1.5 text-fg-muted text-xs">{badge}</span>
        <span className="ml-auto flex gap-2 text-fg-muted">
          <Icon name="codicon:copy" size={14} />
          <Icon name="codicon:clear-all" size={14} />
        </span>
      </div>
      <div className="flex-1 py-2">{children}</div>
    </div>
  );
}

/** Toolbox: a list of offline utilities; TOML ⇄ JSON conversion open. */
export function ToolboxMockup() {
  return (
    <MockWindow
      title="Toolbox"
      statusBar={
        <StatusBar>
          <StatusBarSection>
            <StatusBarItem icon="codicon:pass">Valid TOML</StatusBarItem>
            <StatusBarItem>17 lines → 21 lines</StatusBarItem>
          </StatusBarSection>
          <StatusBarSection align="end">
            <StatusBarItem icon="codicon:debug-disconnect">Offline</StatusBarItem>
          </StatusBarSection>
        </StatusBar>
      }
    >
      <div className="hairline-r flex w-[216px] shrink-0 flex-col bg-surface-sidebar px-2 pt-3">
        <p className="mb-1 px-2 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
          Tools
        </p>
        {TOOLS.map((tool) => (
          <div
            key={tool.label}
            className={cn(
              'flex h-7 items-center gap-2 rounded-md px-2 text-md',
              tool.active ? 'bg-selection text-fg-strong' : 'text-fg',
            )}
          >
            <Icon
              name={tool.icon}
              size={16}
              className={tool.active ? 'text-accent-fg' : 'text-fg-muted'}
            />
            {tool.label}
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <p className="font-semibold text-fg-strong text-lg">TOML ⇄ JSON</p>
          <span className="text-fg-muted text-sm">Convert config files in either direction</span>
          <span className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" leadingIcon="codicon:arrow-swap">
              Swap
            </Button>
            <Button size="sm" variant="primary" leadingIcon="codicon:play">
              Convert
            </Button>
          </span>
        </div>
        <div className="flex min-h-0 flex-1 gap-3">
          <Pane title="config.toml" badge="TOML">
            <CodeLines name="config-toml" lineNumbers />
          </Pane>
          <Pane title="config.json" badge="JSON">
            <CodeLines name="config-json" lineNumbers />
          </Pane>
        </div>
      </div>
    </MockWindow>
  );
}
