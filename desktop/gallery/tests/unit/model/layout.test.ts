import { describe, expect, test } from 'bun:test';

import {
  gridLayout,
  groupByDate,
  justify,
  timelineLayout,
  visibleBlocks,
} from '../../../src/model/layout.util';
import { mediaItem } from '../fixtures';

const DAY = 86_400_000;

describe('layout', () => {
  test('groups items by day, month or year, in list order', () => {
    const base = Date.UTC(2026, 8, 20, 12);
    const items = [
      mediaItem(1, { date: base }),
      mediaItem(2, { date: base - 1000 }),
      mediaItem(3, { date: base - 3 * DAY }),
      mediaItem(4, { date: base - 40 * DAY }),
    ];
    expect(groupByDate(items, 'day', base).map((section) => section.items.length)).toEqual([
      2, 1, 1,
    ]);
    expect(groupByDate(items, 'month', base).map((section) => section.items.length)).toEqual([
      3, 1,
    ]);
    expect(groupByDate(items, 'year', base)).toHaveLength(1);
  });

  test('justified rows fill the width and keep each photo’s shape', () => {
    const items = Array.from({ length: 10 }, (_, index) => mediaItem(index + 1));
    const rows = justify(items, 1000, 180, 4);
    const [first] = rows;
    expect(first).toBeDefined();
    if (first === undefined) return;
    const last = first.cells.at(-1);
    expect(last).toBeDefined();
    if (last === undefined) return;
    expect(last.left + last.width).toBeCloseTo(1000, 5);
    for (const cell of first.cells) expect(cell.width / first.height).toBeCloseTo(1.5);
    // The last, short row is not stretched past the target height.
    expect(rows.at(-1)?.height).toBeLessThanOrEqual(180);
  });

  test('the timeline stacks headers and rows and knows each item’s row', () => {
    const items = [mediaItem(1), mediaItem(2), mediaItem(3)];
    const layout = timelineLayout(groupByDate(items, 'month'), {
      width: 800,
      rowHeight: 180,
      gap: 4,
      headerHeight: 44,
    });
    expect(layout.blocks[0]?.type).toBe('header');
    expect(layout.order).toEqual([1, 2, 3]);
    expect(layout.rowOf.get(1)).toBe(1);
    expect(layout.height).toBeGreaterThan(44);
  });

  test('the grid makes square tiles in whole columns', () => {
    const items = Array.from({ length: 7 }, (_, index) => mediaItem(index + 1));
    const layout = gridLayout(items, { width: 500, tile: 164, gap: 4 });
    expect(layout.columns).toBe(3);
    expect(layout.blocks).toHaveLength(3);
    const cell = layout.blocks[0]?.type === 'row' ? layout.blocks[0].cells[0] : undefined;
    expect(cell?.width).toBeCloseTo(layout.blocks[0]?.height ?? 0);
  });

  test('only the blocks near the viewport are rendered', () => {
    const items = Array.from({ length: 60 }, (_, index) => mediaItem(index + 1));
    const layout = gridLayout(items, { width: 500, tile: 164, gap: 4 });
    const visible = visibleBlocks(layout.blocks, 0, 300);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(layout.blocks.length);
  });
});
