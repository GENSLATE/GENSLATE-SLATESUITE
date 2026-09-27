import { cn } from '@genslate/design-system';
import type { ReactNode } from 'react';

export interface SectionHeadingProps {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly lead?: ReactNode;
  readonly align?: 'start' | 'center';
  /** Heading level (the page title is the only h1). @default 2 */
  readonly level?: 1 | 2;
  readonly id?: string;
  readonly className?: string;
}

/** Eyebrow, display title and lead paragraph, revealed on scroll. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'start',
  level = 2,
  id,
  className,
}: SectionHeadingProps) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className={cn('reveal max-w-3xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow ? (
        <p className="mb-4 font-semibold text-accent-fg text-sm uppercase tracking-[0.14em]">
          {eyebrow}
        </p>
      ) : null}
      <Heading id={id} className="font-semibold text-display">
        {title}
      </Heading>
      {lead ? <p className="mt-5 text-fg-secondary text-lead">{lead}</p> : null}
    </div>
  );
}

/** A page section with the site's max width and vertical rhythm. */
export function Section({
  children,
  className,
  id,
  labelledBy,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
  readonly labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn('mx-auto max-w-site px-4 py-20 sm:px-6 md:py-28', className)}
    >
      {children}
    </section>
  );
}
