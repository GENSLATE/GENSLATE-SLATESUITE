/** Sorting and filtering for the file views. */
import type { Entry, SortKey } from '../ipc/explorer.types';
import { kindLabel } from './format.util';

/** Natural order: `file2` before `file10`, case-insensitive. */
const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export interface SortOptions {
  readonly by: SortKey;
  readonly descending: boolean;
  readonly foldersFirst: boolean;
}

/** A sorted copy of `entries`. Ties fall back to the name, so the order is stable. */
export function sortEntries(entries: readonly Entry[], options: SortOptions): Entry[] {
  const direction = options.descending ? -1 : 1;
  return entries.toSorted((a, b) => {
    if (options.foldersFirst && a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    const primary = compareBy(a, b, options.by);
    return (primary === 0 ? COLLATOR.compare(a.name, b.name) : primary) * direction;
  });
}

function compareBy(a: Entry, b: Entry, by: SortKey): number {
  switch (by) {
    case 'name':
      return COLLATOR.compare(a.name, b.name);
    case 'modified':
      return (a.modified ?? 0) - (b.modified ?? 0);
    case 'size':
      return (a.size ?? -1) - (b.size ?? -1);
    case 'kind':
      return COLLATOR.compare(kindLabel(a), kindLabel(b));
  }
}

/** Entries whose name contains `filter` (case-insensitive); all of them for an empty filter. */
export function filterEntries(entries: readonly Entry[], filter: string): readonly Entry[] {
  const needle = filter.trim().toLowerCase();
  if (needle === '') return entries;
  return entries.filter((entry) => entry.name.toLowerCase().includes(needle));
}
