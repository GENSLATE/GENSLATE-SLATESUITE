/** Modules generated at build time by `plugins/content.plugin.ts`. */

declare module 'virtual:genslate-docs' {
  import type { DocEntry } from './content.types';

  export const docs: readonly DocEntry[];
  /** The page's HTML (its own chunk), or undefined for an unknown slug. */
  export function loadDocHtml(slug: string): Promise<string | undefined>;
}

declare module 'virtual:genslate-snippets' {
  import type { SnippetLines } from './content.types';

  export const snippets: Readonly<Record<string, SnippetLines>>;
}
