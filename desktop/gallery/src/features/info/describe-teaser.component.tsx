import { Badge, Icon } from '@genslate/design-system';

import type { MediaItem } from '../../ipc/gallery.types';

/** Sample suggestions, faded: what auto-tagging will offer. */
const SAMPLE_TAGS = ['mountains', 'golden hour', 'hiking', 'lake'] as const;

/**
 * ✦ A preview of the assistant's photo understanding: a written description (alt text) and
 * suggested tags, made on this computer. Shown as coming soon.
 */
export function DescribeTeaser({ item }: { readonly item: MediaItem | null }) {
  return (
    <section
      aria-label="Smart description (coming soon)"
      data-slot="describe-teaser"
      className="flex flex-col gap-2.5 rounded-card border border-border-subtle border-dashed p-3"
    >
      <div className="flex items-center gap-2">
        <Icon name="codicon:sparkle" size={14} className="text-accent-fg" />
        <h4 className="font-semibold text-fg-strong text-sm">
          {item === null ? 'Describe these' : 'Describe'}
        </h4>
        <Badge tone="accent" size="sm" pill className="ml-auto">
          Coming soon
        </Badge>
      </div>
      <p className="text-fg-muted text-xs leading-relaxed">
        {item === null
          ? 'Summaries of a selection, and tags for all of them at once.'
          : 'A description you can search and use as alt text, and tags it spots for you.'}{' '}
        It all runs on this computer.
      </p>
      <div aria-hidden className="pointer-events-none flex select-none flex-col gap-2 opacity-60">
        <p className="rounded-control bg-surface-sunken px-2.5 py-2 text-fg-secondary text-xs italic leading-relaxed">
          “A still alpine lake at sunset, pine forest on the shore, snow on the peaks behind.”
        </p>
        <div className="flex flex-wrap gap-1">
          {SAMPLE_TAGS.map((tag) => (
            <span
              key={tag}
              className="flex h-5 items-center gap-1 rounded-full border border-accent-border border-dashed px-2 text-2xs text-accent-fg"
            >
              <Icon name="codicon:add" size={12} />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
