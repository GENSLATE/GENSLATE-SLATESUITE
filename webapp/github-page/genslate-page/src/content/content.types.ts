/** Public names for the content shapes declared in `virtual-modules.d.ts`. */

/** One outline entry (h2 / h3) of a docs page. */
export type DocHeading = GenslateDocHeading;

/** A wiki or developer docs page; its HTML is loaded lazily per page. */
export type DocEntry = GenslateDocEntry;

/** One highlighted token of a code snippet (colours are `var(--shiki-token-*)`). */
export type SnippetToken = GenslateSnippetToken;

export type SnippetLines = readonly (readonly SnippetToken[])[];
