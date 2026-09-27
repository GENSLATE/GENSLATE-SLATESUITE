import { cn, Icon, StatusBar, StatusBarItem, StatusBarSection } from '@genslate/design-system';
import type { CSSProperties, ReactNode } from 'react';

import { MockWindow } from './mock-stage.component';

const at = (delay: number, steps?: number): CSSProperties =>
  ({
    '--type-delay': `${delay}s`,
    ...(steps ? { '--type-steps': steps, '--type-duration': `${steps * 0.055}s` } : {}),
  }) as CSSProperties;

function Prompt({ branch = 'main' }: { readonly branch?: string }) {
  return (
    <span>
      <span className="text-info-fg">~/genslate</span>{' '}
      <span className="text-accent-fg">
        <Icon name="codicon:source-control" size={12} className="translate-y-0.5" /> {branch}
      </span>{' '}
      <span className="text-success-fg">❯</span>{' '}
    </span>
  );
}

function Typed({ text, delay }: { readonly text: string; readonly delay: number }) {
  return (
    <span
      className="mock-type inline-block align-top text-fg-strong"
      style={at(delay, text.length)}
    >
      {text}
    </span>
  );
}

function Out({
  delay,
  children,
  className,
}: {
  readonly delay: number;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn('mock-show', className)} style={at(delay)}>
      {children}
    </div>
  );
}

const Check = () => <span className="text-success-fg">✓</span>;

const LOG = [
  ['a1f9c3e', 'feat(launcher): slash commands for every action', 'HEAD -> main'],
  ['7c02d18', 'feat(design-system): command palette fuzzy ranking', ''],
  ['e44b9a0', 'fix(paths): portable webview profile on Windows', ''],
  ['19d7f52', 'chore(tokens): contrast-checked Snow Storm shades', 'v0.1.0'],
  ['b3a6e21', 'feat(example): state matrices in both themes', ''],
  ['0f8d4c7', 'docs: portability and IPC guides', ''],
  ['6ae1b90', 'build(release): portable zips with .archive rotation', ''],
] as const;

/** Terminal: tabs, a split with a live `bun run check`, and a git log. */
export function TerminalMockup() {
  return (
    <MockWindow
      title="Terminal — ~/genslate"
      statusBar={
        <StatusBar>
          <StatusBarSection>
            <StatusBarItem accent icon="codicon:terminal-bash">
              zsh
            </StatusBarItem>
            <StatusBarItem icon="codicon:source-control">main</StatusBarItem>
            <StatusBarItem icon="codicon:check">0 problems</StatusBarItem>
          </StatusBarSection>
          <StatusBarSection align="end">
            <StatusBarItem>120 × 34</StatusBarItem>
            <StatusBarItem>UTF-8</StatusBarItem>
            <StatusBarItem icon="codicon:color-mode">Nord</StatusBarItem>
          </StatusBarSection>
        </StatusBar>
      }
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hairline-b flex h-9 shrink-0 items-end gap-px bg-tab-strip-bg px-2">
          {[
            { label: 'zsh', detail: '~/genslate', icon: 'codicon:terminal' as const, active: true },
            { label: 'bun', detail: 'dev', icon: 'codicon:play' as const, active: false },
            {
              label: 'pwsh',
              detail: 'C:\\',
              icon: 'codicon:terminal-powershell' as const,
              active: false,
            },
          ].map((tab) => (
            <span
              key={tab.label}
              className={cn(
                'relative flex h-8 items-center gap-2 rounded-t-md px-3 text-sm',
                tab.active ? 'bg-tab-active-bg text-fg-strong' : 'text-fg-muted',
              )}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
              <span className="text-fg-muted">{tab.detail}</span>
              {tab.active ? (
                <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-tab-indicator" />
              ) : null}
            </span>
          ))}
          <span className="mb-1.5 ml-1 grid size-6 place-items-center text-fg-muted">
            <Icon name="codicon:add" size={14} />
          </span>
          <span className="mb-1.5 ml-auto flex items-center gap-2 text-fg-muted">
            <Icon name="codicon:split-horizontal" size={14} />
            <Icon name="codicon:ellipsis" size={14} />
          </span>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1.35fr_1fr] bg-surface-sunken font-mono text-[12.5px] leading-[21px]">
          <div className="min-w-0 overflow-hidden p-4">
            <div>
              <Prompt />
              <span className="text-fg-strong">bun run check</span>
            </div>
            <div className="text-fg-muted">
              $ moon run :lint :typecheck :spell :knip root:rust-lint
            </div>
            <div>
              <Check /> biome <span className="text-fg-muted">— 214 files, no issues</span>
            </div>
            <div>
              <Check /> tsc <span className="text-fg-muted">— 7 projects, strictest</span>
            </div>
            <div>
              <Check /> cspell <span className="text-fg-muted">— 0 unknown words</span>
            </div>
            <div>
              <Check /> knip <span className="text-fg-muted">— no dead code</span>
            </div>
            <div>
              <Check /> clippy <span className="text-fg-muted">— 0 warnings</span>
            </div>
            <div className="mt-1 font-semibold text-success-fg">All checks passed in 8.42s</div>
            <div className="mt-3">
              <Prompt />
              <Typed text="bun run dev" delay={0.8} />
            </div>
            <Out delay={1.7} className="mt-1">
              <span className="rounded-sm bg-success-subtle px-1 font-semibold text-success-fg">
                VITE
              </span>{' '}
              <span className="text-success-fg">v8.3.1</span>{' '}
              <span className="text-fg-muted">ready in</span>{' '}
              <span className="font-semibold text-fg-strong">212 ms</span>
            </Out>
            <Out delay={1.9}>
              <span className="text-success-fg">➜</span>{' '}
              <span className="text-fg-strong">Local:</span>{' '}
              <span className="text-info-fg underline">http://localhost:1420/</span>
            </Out>
            <Out delay={2.2}>
              <span className="text-accent-fg">tauri</span>{' '}
              <span className="text-fg-muted">Running</span>{' '}
              <span className="text-fg">target/debug/genslate-example</span>
            </Out>
            <Out delay={2.5} className="mt-3">
              <Prompt />
              <span className="mock-caret inline-block h-4 w-2 translate-y-0.5 bg-fg" />
            </Out>
          </div>

          <div className="min-w-0 overflow-hidden border-border-subtle border-l p-4">
            <div>
              <Prompt />
              <span className="text-fg-strong">git log --graph --oneline</span>
            </div>
            {LOG.map(([hash, message, ref], index) => (
              <div key={hash} className="flex gap-2 whitespace-nowrap">
                <span className={index === 0 ? 'text-warning-fg' : 'text-accent-fg'}>*</span>
                <span className="text-warning-fg">{hash}</span>
                {ref ? (
                  <span className={ref.startsWith('v') ? 'text-success-fg' : 'text-info-fg'}>
                    ({ref})
                  </span>
                ) : null}
                <span className="truncate text-fg">{message}</span>
              </div>
            ))}
            <div className="mt-3">
              <Prompt />
              <span className="text-fg-strong">bun test</span>
            </div>
            <div className="text-fg-muted">bun test v1.4.2</div>
            <div>
              <span className="text-success-fg">312 pass</span>{' '}
              <span className="text-fg-muted">·</span>{' '}
              <span className="text-fg-muted">0 fail · 1,284 expect() calls</span>
            </div>
            <div className="text-fg-muted">Ran 312 tests across 58 files. [2.31s]</div>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}
