import {
  Badge,
  cn,
  FeatureTeaser,
  FeatureTeaserSample,
  Icon,
  IconButton,
  ScrollArea,
} from '@genslate/design-system';

import { useGallery } from '../../app/gallery.context';
import { collectionTitle } from '../../model/collection.util';
import { plural } from '../../model/format.util';

const PROMPTS = [
  { icon: 'codicon:search-sparkle', text: 'Show sunsets from last summer' },
  { icon: 'codicon:book', text: 'Make an album of the Iceland trip' },
  { icon: 'codicon:copy', text: 'Which blurry shots can I delete?' },
  { icon: 'codicon:comment', text: 'Write captions for these photos' },
] as const;

/**
 * The Assistant tab, a preview: ask about your photos in plain words. It knows what you are
 * looking at, and every Gallery action is a typed command it will be able to run.
 */
export function AssistantPanel() {
  const api = useGallery();
  const subject =
    api.selected.length === 1
      ? `“${api.selected[0]?.name ?? ''}”`
      : api.selected.length > 1
        ? plural(api.selected.length, 'selected photo')
        : collectionTitle(api.collection, api.summary);

  return (
    <div data-slot="assistant-panel" className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1" aria-label="Assistant">
        <FeatureTeaser icon="codicon:sparkle" title="Photo assistant">
          Find photos by describing them, build albums, clean up look-alikes and write captions,
          with a local model that never uploads your pictures.
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
            <Bubble from="you">Find the photos of the lake at sunset from our trip.</Bubble>
            <Bubble from="assistant">
              I found 14 at Lake Louise, taken 12–14 Aug. The sharpest 6 are selected. Make an
              album?
            </Bubble>
            <div className="flex gap-1.5 pl-7">
              <span className="rounded-control bg-accent px-2 py-0.5 text-on-accent text-xs">
                Create album
              </span>
              <span className="rounded-control border border-border px-2 py-0.5 text-fg-secondary text-xs">
                Show all 14
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
        <div className="flex cursor-not-allowed items-end gap-1 rounded-card border border-border-subtle bg-field p-1.5 pl-2.5 opacity-80">
          <textarea
            disabled
            rows={2}
            aria-label="Message the assistant (coming soon)"
            placeholder="Ask about your photos…"
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
