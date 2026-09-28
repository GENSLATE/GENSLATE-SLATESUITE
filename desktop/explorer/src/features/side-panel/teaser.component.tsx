import { Badge, type CodiconRef, Icon } from '@genslate/design-system';
import type { ReactNode } from 'react';

interface TeaserHeroProps {
  readonly icon: CodiconRef;
  readonly title: string;
  readonly children: ReactNode;
}

/** The top of a side-panel preview: what the feature is, marked as coming soon. */
export function TeaserHero({ icon, title, children }: TeaserHeroProps) {
  return (
    <div data-slot="teaser-hero" className="flex flex-col gap-2 px-4 pt-3 pb-4">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md bg-accent-subtle text-accent-fg">
          <Icon name={icon} />
        </span>
        <h2 className="font-semibold text-base text-fg-strong">{title}</h2>
        <Badge tone="accent" size="sm" pill className="ml-auto">
          Coming soon
        </Badge>
      </div>
      <p className="text-fg-secondary text-sm leading-relaxed">{children}</p>
    </div>
  );
}

/** A faded sample of what the feature will show (hidden from assistive tech). */
export function TeaserSample({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div data-slot="teaser-sample" className="flex flex-col gap-1.5 px-4">
      <p className="font-semibold text-2xs text-fg-muted uppercase tracking-wider">{label}</p>
      <div aria-hidden className="pointer-events-none select-none opacity-60">
        {children}
      </div>
    </div>
  );
}
