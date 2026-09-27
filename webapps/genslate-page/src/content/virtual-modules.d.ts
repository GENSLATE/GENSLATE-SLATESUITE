/**
 * Modules generated at build time by `plugins/content.plugin.ts`, and the shapes they export.
 * Ambient module declarations can't import through relative paths, so the shapes live here as
 * globals and `content.types.ts` re-exports them under their public names.
 */

interface GenslateDocHeading {
  readonly id: string;
  readonly text: string;
  readonly level: 2 | 3;
}

interface GenslateDocEntry {
  readonly slug: string;
  /** Base-relative route, e.g. `/docs/launcher/`. */
  readonly route: string;
  readonly title: string;
  readonly description: string;
  readonly section: string;
  readonly order: number;
  readonly icon: import('@genslate/design-system').CodiconRef;
  /** Repo-relative source file (for "Edit on GitHub"). */
  readonly source: string;
  readonly headings: readonly GenslateDocHeading[];
  readonly readingMinutes: number;
}

interface GenslateSnippetToken {
  readonly text: string;
  /** A `var(--shiki-token-*)` colour; absent for the default foreground. */
  readonly color?: string;
  readonly italic?: boolean;
}

declare module 'virtual:genslate-docs' {
  export const docs: readonly GenslateDocEntry[];
  /** The page's HTML (its own chunk), or undefined for an unknown slug. */
  export function loadDocHtml(slug: string): Promise<string | undefined>;
}

declare module 'virtual:genslate-snippets' {
  export const snippets: Readonly<Record<string, readonly (readonly GenslateSnippetToken[])[]>>;
}
