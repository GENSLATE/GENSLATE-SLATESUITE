import { Badge, cn, Icon, IconButton, ScrollArea } from '@genslate/design-system';

import type { ReactNode } from 'react';

import { useTerminal } from '../../app/terminal.context';
import { usePaneState } from '../../engine/pane-store';
import { baseName } from '../../model/path.util';
import { TeaserHero, TeaserSample } from './teaser.component';

const PROMPTS = [
  { icon: 'codicon:lightbulb-autofix', text: 'Why did the last command fail?' },
  { icon: 'codicon:search-sparkle', text: 'What is listening on port 3000?' },
  { icon: 'codicon:file-code', text: 'Turn today’s commands into a script' },
  { icon: 'codicon:note', text: 'Summarize this session' },
] as const;

/**
 * The Assistant tab, a preview: an assistant that reads what the terminal shows, explains
 * errors, writes commands for this shell and remembers your projects across GENSLATE apps
 * (in the shared AI memory database). Nothing here runs yet.
 */
export function AssistantPanel() {
  const api = useTerminal();
  const paneId = api.assistantFocus?.paneId ?? api.activePaneId ?? '';
  const pane = usePaneState(api.store, paneId);
  const failed = api.assistantFocus?.command ?? null;
  const shell = pane?.shellName ?? api.profile(api.defaultProfileId).name;
  const folder = pane?.cwd == null ? null : baseName(pane.cwd) || pane.cwd;

  return (
    <div data-slot="assistant-panel" className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1" aria-label="Assistant">
        <TeaserHero icon="codicon:chat-sparkle" title="Terminal assistant">
          Ask in plain words. It sees the output you see, explains errors, writes commands for{' '}
          {shell} and shows each one before it runs.
        </TeaserHero>

        {failed !== null && failed.exitCode !== null && failed.exitCode !== 0 ? (
          <div className="mx-4 mb-4 flex flex-col gap-1.5 rounded-card bg-danger-subtle p-2.5 ring-1 ring-danger-border">
            <p className="flex items-center gap-1.5 font-medium text-danger-fg text-xs">
              <Icon name="codicon:error" size={12} />
              Exited with code {failed.exitCode}
            </p>
            <code className="truncate font-mono text-fg-strong text-xs">{failed.command}</code>
            <p className="text-fg-secondary text-xs">
              Soon: the reason it failed and a fix you can run with one click.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5 px-4 pb-4">
          <p className="font-semibold text-2xs text-fg-muted uppercase tracking-wider">
            Try asking
          </p>
          {PROMPTS.map((prompt) => (
            <button
              key={prompt.text}
              type="button"
              disabled
              title="Coming soon"
              className="flex h-8 items-center gap-2 rounded-control border border-border-subtle bg-surface-raised px-2.5 text-left text-fg-secondary text-sm disabled:cursor-not-allowed"
            >
              <Icon name={prompt.icon} size={14} className="text-accent-fg" />
              <span className="truncate">{prompt.text}</span>
            </button>
          ))}
        </div>

        <TeaserSample label="Example">
          <div className="flex flex-col gap-2 pb-4">
            <Bubble from="you">Why does cargo test fail?</Bubble>
            <Bubble from="assistant">
              <code className="font-mono text-xs">parse_osc7</code> expects a drive letter, but the
              test passes a WSL path. Run it again with the fix below?
            </Bubble>
            <div className="ml-7 overflow-hidden rounded-control bg-terminal-bg ring-1 ring-border-subtle">
              <code className="block px-2.5 py-1.5 font-mono text-terminal-fg text-xs">
                cargo test -p terminal-core osc
              </code>
              <div className="hairline-t flex gap-1.5 px-2 py-1.5">
                <span className="rounded-control bg-accent px-2 py-0.5 text-on-accent text-xs">
                  Run
                </span>
                <span className="rounded-control border border-border px-2 py-0.5 text-fg-secondary text-xs">
                  Insert
                </span>
              </div>
            </div>
          </div>
        </TeaserSample>

        <TeaserSample label="Remembers">
          <ul className="flex flex-col gap-1 pb-4 text-fg-secondary text-xs">
            <li className="flex items-center gap-1.5">
              <Icon name="codicon:database" size={12} className="text-accent-fg" />
              Your projects, their build and test commands
            </li>
            <li className="flex items-center gap-1.5">
              <Icon name="codicon:comment-discussion" size={12} className="text-accent-fg" />
              Past conversations, shared with every GENSLATE app
            </li>
            <li className="flex items-center gap-1.5">
              <Icon name="codicon:lock" size={12} className="text-accent-fg" />
              Stored in your portable folder, never uploaded
            </li>
          </ul>
        </TeaserSample>
      </ScrollArea>

      <div className="hairline-t flex flex-col gap-1.5 p-2">
        <div className="flex items-center gap-1.5 px-1 text-fg-muted text-xs">
          <Icon name="codicon:terminal" size={12} />
          <span className="truncate">
            Sees {shell}
            {folder === null ? '' : ` in ${folder}`}
          </span>
        </div>
        <div
          className={cn(
            'flex items-end gap-1 rounded-card border border-border-subtle bg-field p-1.5 pl-2.5',
            'cursor-not-allowed opacity-80',
          )}
        >
          <textarea
            disabled
            rows={2}
            aria-label="Message the assistant (coming soon)"
            placeholder="Ask about this terminal…"
            className="min-h-10 flex-1 resize-none bg-transparent text-base text-fg placeholder:text-fg-muted disabled:cursor-not-allowed"
          />
          <IconButton
            size="sm"
            variant="primary"
            icon="codicon:send"
            label="Send (coming soon)"
            disabled
          />
        </div>
        <div className="flex items-center justify-between px-1">
          <Badge tone="accent" size="sm" pill icon="codicon:sparkle">
            Coming soon
          </Badge>
          <span className="text-2xs text-fg-muted">Local or cloud models</span>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  from,
  children,
}: {
  readonly from: 'you' | 'assistant';
  readonly children: ReactNode;
}) {
  const you = from === 'you';
  return (
    <div className={cn('flex items-start gap-2', you && 'flex-row-reverse')}>
      <span
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full',
          you ? 'bg-fill-pressed text-fg-secondary' : 'bg-accent-subtle text-accent-fg',
        )}
      >
        <Icon name={you ? 'codicon:account' : 'codicon:sparkle'} size={12} />
      </span>
      <p
        className={cn(
          'max-w-[85%] rounded-card px-2.5 py-1.5 text-sm leading-snug',
          you
            ? 'bg-accent-subtle text-fg-strong'
            : 'bg-surface-raised text-fg ring-1 ring-border-subtle',
        )}
      >
        {children}
      </p>
    </div>
  );
}
