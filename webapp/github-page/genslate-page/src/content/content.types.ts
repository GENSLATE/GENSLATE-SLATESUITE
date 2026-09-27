import type { CodiconRef } from '@genslate/design-system';

/** One outline entry of a docs page. */
export interface DocHeading {
  readonly id: string;
  readonly text: string;
  readonly level: 2 | 3;
}

/** A wiki or developer docs page (HTML is loaded lazily per page). */
export interface DocEntry {
  readonly slug: string;
  /** Base-relative route, e.g. `/docs/launcher/`. */
  readonly route: string;
  readonly title: string;
  readonly description: string;
  readonly section: string;
  readonly order: number;
  readonly icon: CodiconRef;
  /** Repo-relative source file (for "Edit on GitHub"). */
  readonly source: string;
  readonly headings: readonly DocHeading[];
  readonly readingMinutes: number;
}

/** One highlighted token of a code snippet (colours are `var(--shiki-token-*)`). */
export interface SnippetToken {
  readonly text: string;
  readonly color?: string;
  readonly italic?: boolean;
}

export type SnippetLines = readonly (readonly SnippetToken[])[];
