import { Avatar, Button, cn, Icon, Spinner } from '@genslate/design-system';
import { AppIcon } from '../../components/app-icon.component';
import { BrandMark } from '../../components/brand-mark.component';
import { findApp } from '../../content/apps.content';

import { MockWindow } from './mock-stage.component';

const CHATS = [
  { title: 'Zip last week’s screenshots', when: 'Now', active: true },
  { title: 'Explain the IPC layer', when: '10:12' },
  { title: 'Trip itinerary, Norway', when: 'Yesterday' },
  { title: 'Regex for semver tags', when: 'Mon' },
] as const;

function ToolCard({
  app,
  title,
  detail,
  state,
}: {
  readonly app: string;
  readonly title: string;
  readonly detail: string;
  readonly state: 'done' | 'ask';
}) {
  const entry = findApp(app);
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5',
        state === 'ask'
          ? 'border-accent-border bg-accent-subtle'
          : 'border-border-subtle bg-surface-raised',
      )}
    >
      {entry ? <AppIcon app={entry} size={28} /> : null}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg-strong text-md">{title}</p>
        <p className="truncate font-mono text-fg-muted text-xs">{detail}</p>
      </div>
      {state === 'done' ? (
        <span className="flex items-center gap-1 text-sm text-success-fg">
          <Icon name="codicon:pass-filled" size={14} /> Done
        </span>
      ) : (
        <span className="flex gap-2">
          <Button size="sm" variant="ghost">
            Deny
          </Button>
          <Button size="sm" variant="primary" leadingIcon="codicon:check">
            Approve
          </Button>
        </span>
      )}
    </div>
  );
}

/** AI Studio: conversations, an assistant that uses GENSLATE tools, and approvals. */
export function AiStudioMockup() {
  return (
    <MockWindow title="AI Studio">
      <div className="hairline-r flex w-[232px] shrink-0 flex-col bg-surface-sidebar px-2 pt-3">
        <span className="mx-1 mb-3 flex h-8 items-center gap-2 rounded-control border border-border bg-control px-2.5 text-fg text-md shadow-control">
          <Icon name="codicon:add" size={14} /> New chat
        </span>
        <p className="mb-1 px-2 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
          Recent
        </p>
        {CHATS.map((chat) => (
          <div
            key={chat.title}
            className={cn(
              'flex h-8 items-center gap-2 rounded-md px-2 text-md',
              'active' in chat && chat.active ? 'bg-selection text-fg-strong' : 'text-fg',
            )}
          >
            <Icon name="codicon:comment" size={14} className="text-fg-muted" />
            <span className="flex-1 truncate">{chat.title}</span>
            <span className="text-2xs text-fg-muted">{chat.when}</span>
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-5 overflow-hidden px-10 pt-6">
          <div className="flex justify-end">
            <p className="max-w-[440px] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-md text-on-accent">
              Find last week’s screenshots, zip them and put the archive on the Desktop for the
              team.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-raised shadow-card">
              <BrandMark className="size-4" />
            </span>
            <div className="grid min-w-0 flex-1 gap-3">
              <p className="text-fg text-md leading-relaxed">
                I found <strong className="text-fg-strong">14 screenshots</strong> from 16–22
                February in your portable Pictures folder (38 MB). Here’s the plan — I’ll only zip
                them once you approve.
              </p>
              <ToolCard
                app="explorer"
                title="Search files"
                detail="Pictures/Screenshots · modified:last-week · 14 results"
                state="done"
              />
              <ToolCard
                app="command"
                title="Create archive"
                detail="→ Desktop/screenshots-2026-w08.zip"
                state="ask"
              />
              <p className="flex items-center gap-2 text-fg-muted text-sm">
                <Spinner size={12} decorative /> Waiting for your approval…
              </p>
            </div>
          </div>
        </div>
        <div className="m-4 mt-2 rounded-xl border border-border bg-field p-3 shadow-card">
          <p className="text-fg-muted text-md">Ask anything, or type / for tools…</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-fill-hover px-2.5 py-1 text-fg text-xs">
              <Icon name="codicon:server-process" size={12} /> Local model
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-fill-hover px-2.5 py-1 text-fg text-xs">
              <Icon name="codicon:tools" size={12} /> 12 tools
            </span>
            <span className="ml-auto flex items-center gap-2 text-fg-muted">
              <Icon name="codicon:attach" size={16} />
              <Avatar name="You" size="sm" />
              <span className="grid size-7 place-items-center rounded-full bg-accent text-on-accent">
                <Icon name="codicon:arrow-up" size={14} />
              </span>
            </span>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}
