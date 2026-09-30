/**
 * Layout for the photo views, computed up front so only the rows on screen are rendered:
 * the timeline's date sections of justified rows (every row fills the width, photos keep
 * their shape) and the grid's square tiles.
 */
import type { GroupBy, MediaItem } from '../ipc/gallery.types';
import { formatDayTitle, formatMonthTitle } from './format.util';

/** Extreme panoramas and slivers are shown cropped to this range. */
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 2.4;

/** Width ÷ height, clamped; square when unknown. */
export function aspectOf(item: MediaItem): number {
  if (item.width === null || item.height === null || item.height === 0) return 1;
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, item.width / item.height));
}

/** Items taken on the same day (month, year). */
export interface Section {
  readonly key: string;
  readonly title: string;
  /** The newest item's date. */
  readonly date: number;
  readonly items: readonly MediaItem[];
}

function sectionKey(ms: number, groupBy: GroupBy): string {
  const date = new Date(ms);
  if (groupBy === 'year') return String(date.getFullYear());
  if (groupBy === 'month') return `${date.getFullYear()}-${date.getMonth()}`;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function sectionTitle(ms: number, groupBy: GroupBy, now: number): string {
  if (groupBy === 'year') return String(new Date(ms).getFullYear());
  if (groupBy === 'month') return formatMonthTitle(ms);
  return formatDayTitle(ms, now);
}

/** Splits date-sorted items into sections (consecutive items with the same key). */
export function groupByDate(
  items: readonly MediaItem[],
  groupBy: GroupBy,
  now = Date.now(),
): readonly Section[] {
  const sections: { key: string; title: string; date: number; items: MediaItem[] }[] = [];
  for (const item of items) {
    const key = sectionKey(item.date, groupBy);
    const last = sections.at(-1);
    if (last !== undefined && last.key === key) last.items.push(item);
    else
      sections.push({
        key,
        title: sectionTitle(item.date, groupBy, now),
        date: item.date,
        items: [item],
      });
  }
  return sections;
}

/** One photo placed in a row. */
export interface Cell {
  readonly item: MediaItem;
  readonly left: number;
  readonly width: number;
}

export type Block =
  | {
      readonly type: 'header';
      readonly key: string;
      readonly top: number;
      readonly height: number;
      readonly section: Section;
    }
  | {
      readonly type: 'row';
      readonly key: string;
      readonly top: number;
      readonly height: number;
      readonly cells: readonly Cell[];
    };

export interface Layout {
  readonly blocks: readonly Block[];
  readonly height: number;
  /** Item ids in reading order (for keyboard moves and Shift-ranges). */
  readonly order: readonly number[];
  /** Item id → the row it sits in (for scrolling it into view). */
  readonly rowOf: ReadonlyMap<number, number>;
}

/**
 * Greedy justified rows: add photos until the row at `rowHeight` would overflow `width`,
 * then scale the row to fit exactly. The last row keeps `rowHeight` (never stretched).
 */
export function justify(
  items: readonly MediaItem[],
  width: number,
  rowHeight: number,
  gap: number,
): readonly { readonly height: number; readonly cells: readonly Cell[] }[] {
  const rows: { height: number; cells: Cell[] }[] = [];
  let pending: MediaItem[] = [];
  let aspects = 0;
  const place = (row: readonly MediaItem[], height: number) => {
    let left = 0;
    const cells = row.map((item) => {
      const cellWidth = aspectOf(item) * height;
      const cell = { item, left, width: cellWidth };
      left += cellWidth + gap;
      return cell;
    });
    rows.push({ height, cells });
  };
  for (const item of items) {
    pending.push(item);
    aspects += aspectOf(item);
    const gaps = gap * (pending.length - 1);
    if (aspects * rowHeight + gaps >= width) {
      place(pending, Math.max(1, (width - gaps) / aspects));
      pending = [];
      aspects = 0;
    }
  }
  if (pending.length > 0) {
    const gaps = gap * (pending.length - 1);
    place(pending, Math.min(rowHeight, Math.max(1, (width - gaps) / aspects)));
  }
  return rows;
}

interface LayoutOptions {
  readonly width: number;
  readonly rowHeight: number;
  readonly gap: number;
  readonly headerHeight: number;
}

/** Sections of justified rows under their date headers. */
export function timelineLayout(sections: readonly Section[], options: LayoutOptions): Layout {
  const { width, rowHeight, gap, headerHeight } = options;
  const blocks: Block[] = [];
  const order: number[] = [];
  const rowOf = new Map<number, number>();
  let top = 0;
  if (width <= 0) return { blocks, height: 0, order, rowOf };
  for (const section of sections) {
    if (section.title !== '') {
      blocks.push({ type: 'header', key: `h:${section.key}`, top, height: headerHeight, section });
      top += headerHeight;
    }
    justify(section.items, width, rowHeight, gap).forEach((row, index) => {
      for (const cell of row.cells) {
        order.push(cell.item.id);
        rowOf.set(cell.item.id, blocks.length);
      }
      blocks.push({
        type: 'row',
        key: `r:${section.key}:${index}`,
        top,
        height: row.height,
        cells: row.cells,
      });
      top += row.height + gap;
    });
  }
  return { blocks, height: top, order, rowOf };
}

/** Square tiles, as many columns as fit at about `tile` pixels. */
export function gridLayout(
  items: readonly MediaItem[],
  options: { readonly width: number; readonly tile: number; readonly gap: number },
): Layout & { readonly columns: number } {
  const { width, tile, gap } = options;
  const blocks: Block[] = [];
  const rowOf = new Map<number, number>();
  if (width <= 0) return { blocks, height: 0, order: [], rowOf, columns: 1 };
  const columns = Math.max(1, Math.round((width + gap) / (tile + gap)));
  const size = (width - gap * (columns - 1)) / columns;
  let top = 0;
  for (let start = 0; start < items.length; start += columns) {
    const cells = items.slice(start, start + columns).map((item, index) => {
      rowOf.set(item.id, blocks.length);
      return { item, left: index * (size + gap), width: size };
    });
    blocks.push({ type: 'row', key: `g:${start}`, top, height: size, cells });
    top += size + gap;
  }
  return { blocks, height: top, order: items.map((item) => item.id), rowOf, columns };
}

/** The blocks that overlap `[from, to]` (binary search; blocks are sorted by `top`). */
export function visibleBlocks(
  blocks: readonly Block[],
  from: number,
  to: number,
): readonly Block[] {
  let low = 0;
  let high = blocks.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    const block = blocks[middle];
    if (block !== undefined && block.top + block.height < from) low = middle + 1;
    else high = middle;
  }
  const visible: Block[] = [];
  for (let index = low; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block === undefined || block.top > to) break;
    visible.push(block);
  }
  return visible;
}
