import { CodeBlock, cn } from '@genslate/design-system';
import type { ReactNode } from 'react';

interface SpecimenProps {
  title: string;
  description?: ReactNode;
  /** Right side of the heading (e.g. a small control that tweaks the demo). */
  aside?: ReactNode;
  /** Usage snippet shown under the stage. */
  code?: string;
  /** Stage layout; defaults to a wrapping row. */
  stageClassName?: string;
  /** Render the children without a stage frame. */
  bare?: boolean;
  children: ReactNode;
}

/** A titled demo block: heading, a hairline stage with the live component, and optional code. */
export function Specimen({ title, description, aside, code, stageClassName, bare = false, children }: SpecimenProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-md font-semibold text-fg-strong">{title}</h2>
          {description != null && <p className="text-base text-fg-muted">{description}</p>}
        </div>
        {aside != null && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </div>
      {bare ? (
        children
      ) : (
        <div className="overflow-hidden rounded-card inset-ring inset-ring-border-subtle">
          <div className={cn('flex flex-wrap items-center gap-3 p-6', stageClassName)}>{children}</div>
          {code != null && (
            <CodeBlock
              code={code}
              className="rounded-none bg-surface-sunken inset-ring-0 hairline-t"
              language="tsx"
            />
          )}
        </div>
      )}
    </section>
  );
}
