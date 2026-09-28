/** The details list's columns and their (remembered) widths. */
import type { SortKey } from '../../ipc/explorer.types';

export type DetailsColumnId = 'name' | 'modified' | 'kind' | 'size' | 'location';

export interface DetailsColumn {
  readonly id: DetailsColumnId;
  readonly label: string;
  readonly sort: SortKey | null;
  readonly align: 'start' | 'end';
  /** px; the name column takes the rest. */
  readonly width: number;
}

export type ColumnWidths = Readonly<Record<Exclude<DetailsColumnId, 'name'>, number>>;

export const DEFAULT_WIDTHS: ColumnWidths = { modified: 150, kind: 140, size: 84, location: 260 };
export const MIN_WIDTH = 56;
export const MAX_WIDTH = 520;

/** The columns for a folder, or for search results (where the folder replaces the kind). */
export function detailsColumns(widths: ColumnWidths, searching: boolean): readonly DetailsColumn[] {
  const name: DetailsColumn = { id: 'name', label: 'Name', sort: 'name', align: 'start', width: 0 };
  const middle: DetailsColumn = searching
    ? { id: 'location', label: 'Folder', sort: null, align: 'start', width: widths.location }
    : { id: 'kind', label: 'Kind', sort: 'kind', align: 'start', width: widths.kind };
  return [
    name,
    {
      id: 'modified',
      label: 'Date modified',
      sort: 'modified',
      align: 'start',
      width: widths.modified,
    },
    middle,
    { id: 'size', label: 'Size', sort: 'size', align: 'end', width: widths.size },
  ];
}

/** Widths saved as JSON; anything unreadable falls back to the defaults. */
export function parseWidths(raw: string | null): ColumnWidths {
  if (raw === null) return DEFAULT_WIDTHS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return DEFAULT_WIDTHS;
    const read = (key: keyof ColumnWidths) => {
      const width: unknown = (value as Record<string, unknown>)[key];
      return typeof width === 'number' && Number.isFinite(width)
        ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))
        : DEFAULT_WIDTHS[key];
    };
    return {
      modified: read('modified'),
      kind: read('kind'),
      size: read('size'),
      location: read('location'),
    };
  } catch {
    // A corrupt preference: use the defaults.
    return DEFAULT_WIDTHS;
  }
}
