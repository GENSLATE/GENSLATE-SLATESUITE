import {
  Badge,
  cn,
  FeatureTeaser,
  FeatureTeaserSample,
  Icon,
  IconButton,
  ScrollArea,
} from '@genslate/design-system';

import { useExplorer } from '../../app/explorer.context';
import { plural } from '../../model/format.util';
import { baseName } from '../../model/path.util';

const PROMPTS = [
  { icon: 'codicon:note', text: 'Summarize this folder' },
  { icon: 'codicon:search-sparkle', text: 'Find last month’s invoices' },
  { icon: 'codicon:pie-chart', text: 'What is taking up space?' },
  { icon: 'codicon:wand', text: 'Rename these photos by date' },
] as const;

/**
 * The Chat tab, a preview: talk to your files. It already knows what you are looking at (the
 * folder, the selection), and every explorer action is a typed command it will be able to run.
 */
export function ChatPanel() {
  const api = useExplorer();
  const subject =
    api.selected.length === 1
      ? `“${api.selected[0]?.name ?? ''}”`
      : api.selected.length > 1
        ? plural(api.selected.length, 'selected item')
        : `“${baseName(api.tab.path)}”`;

  return (
    <div data-slot="chat-panel" className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1" aria-label="Chat">
        <FeatureTeaser icon="codicon:chat-sparkle" title="Chat with your files">
          Ask in plain words and the assistant finds, explains and organizes files for you, then
          shows each change before it makes it.
        </FeatureTeaser>

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

        <FeatureTeaserSample label="Example">
          <div className="flex flex-col gap-2 pb-4">
            <Bubble from="you">Which files in Downloads can I delete?</Bubble>
            <Bubble from="assistant">
              12 installers you already ran (2.3 GB) and 4 copies of files in Documents. Move them
              to the Trash?
            </Bubble>
            <div className="flex gap-1.5 pl-7">
              <span className="rounded-control bg-accent px-2 py-0.5 text-on-accent text-xs">
                Review 16 files
              </span>
              <span className="rounded-control border border-border px-2 py-0.5 text-fg-secondary text-xs">
                Not now
              </span>
            </div>
          </div>
        </FeatureTeaserSample>
      </ScrollArea>

      <div className="hairline-t flex flex-col gap-1.5 p-2">
        <div className="flex items-center gap-1.5 px-1 text-fg-muted text-xs">
          <Icon name="codicon:attach" size={12} />
          <span className="truncate">Ask about {subject}</span>
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
            placeholder="Message the assistant…"
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
        <div className="flex items-center px-1">
          <Badge tone="accent" size="sm" pill icon="codicon:sparkle">
            Coming soon
          </Badge>
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
  readonly children: string;
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
