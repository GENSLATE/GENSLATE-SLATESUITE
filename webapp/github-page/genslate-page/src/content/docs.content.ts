import { docs, loadDocHtml } from 'virtual:genslate-docs';

import type { DocEntry } from './content.types';

/** Sidebar sections, in reading order. Unknown sections sort after these. */
export const DOC_SECTIONS = ['Get started', 'Using GENSLATE', 'The apps', 'Developers'] as const;

function sectionRank(section: string): number {
  const index = (DOC_SECTIONS as readonly string[]).indexOf(section);
  return index === -1 ? DOC_SECTIONS.length : index;
}

/** Every docs page, sorted by section then `order`. */
export const DOCS: readonly DocEntry[] = [...docs].sort(
  (a, b) =>
    sectionRank(a.section) - sectionRank(b.section) ||
    a.order - b.order ||
    a.title.localeCompare(b.title),
);

export interface DocSection {
  readonly title: string;
  readonly pages: readonly DocEntry[];
}

/** Pages grouped by section, in sidebar order. */
export const DOC_GROUPS: readonly DocSection[] = DOCS.reduce<DocSection[]>((groups, doc) => {
  const last = groups.at(-1);
  if (last?.title === doc.section) {
    groups[groups.length - 1] = { title: last.title, pages: [...last.pages, doc] };
  } else {
    groups.push({ title: doc.section, pages: [doc] });
  }
  return groups;
}, []);

export function findDoc(slug: string): DocEntry | undefined {
  return DOCS.find((doc) => doc.slug === slug);
}

/** The pages before and after `slug`, in reading order. */
export function neighbours(slug: string): { previous?: DocEntry; next?: DocEntry } {
  const index = DOCS.findIndex((doc) => doc.slug === slug);
  const previous = index > 0 ? DOCS[index - 1] : undefined;
  const next = index >= 0 ? DOCS[index + 1] : undefined;
  return { ...(previous ? { previous } : {}), ...(next ? { next } : {}) };
}

export { loadDocHtml };
