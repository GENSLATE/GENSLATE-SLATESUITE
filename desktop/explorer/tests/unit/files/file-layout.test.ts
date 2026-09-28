import { describe, expect, test } from 'bun:test';

import {
  DEFAULT_WIDTHS,
  detailsColumns,
  MAX_WIDTH,
  parseWidths,
} from '../../../src/features/files/details-columns.util';
import {
  cellBox,
  contentHeight,
  gridLayout,
  itemsIn,
  scrollToReveal,
  visibleRange,
} from '../../../src/features/files/file-layout.util';

describe('file layout', () => {
  const grid = gridLayout(500, { width: 100, height: 100 }, 12, 6);

  test('fits as many columns as the width allows', () => {
    expect(grid.columns).toBe(4);
    expect(gridLayout(50, { width: 100, height: 100 }, 12, 6).columns).toBe(1);
    expect(contentHeight(grid, 9, 10)).toBe(12 + 3 * 100 + 10);
  });

  test('cells and marquee hits', () => {
    expect(cellBox(grid, 5)).toEqual({ x: 12 + 106, y: 112, width: 100, height: 100 });
    // A box over the gap between cells 0 and 1 and reaching into the second row.
    expect(itemsIn(grid, 9, { x: 100, y: 50, width: 30, height: 100 })).toEqual([0, 1, 4, 5]);
    expect(itemsIn(grid, 2, { x: 0, y: 0, width: 500, height: 500 })).toEqual([0, 1]);
  });

  test('only visible rows render, with overscan', () => {
    const list = { columns: 1, cellWidth: 800, rowHeight: 22, top: 28, left: 0, gap: 0 };
    expect(visibleRange(list, 10_000, 22_000, 440)).toEqual({ start: 994, end: 1024 });
    expect(visibleRange(list, 3, 0, 0)).toEqual({ start: 0, end: 3 });
  });

  test('scrolls just enough to reveal an item under a sticky header', () => {
    const list = { columns: 1, cellWidth: 800, rowHeight: 22, top: 28, left: 0, gap: 0 };
    expect(scrollToReveal(list, 0, 500, 300, 28)).toBe(0);
    expect(scrollToReveal(list, 50, 0, 300, 28)).toBe(28 + 51 * 22 - 300);
    expect(scrollToReveal(list, 5, 0, 300, 28)).toBe(0);
  });
});

describe('details columns', () => {
  test('search results show the folder instead of the kind', () => {
    expect(detailsColumns(DEFAULT_WIDTHS, false).map((column) => column.id)).toEqual([
      'name',
      'modified',
      'kind',
      'size',
    ]);
    expect(detailsColumns(DEFAULT_WIDTHS, true)[2]?.id).toBe('location');
  });

  test('saved widths are clamped and corrupt ones ignored', () => {
    expect(parseWidths(null)).toBe(DEFAULT_WIDTHS);
    expect(parseWidths('{nope')).toBe(DEFAULT_WIDTHS);
    const widths = parseWidths(JSON.stringify({ kind: 9000, size: 'x', modified: 200 }));
    expect(widths).toEqual({ ...DEFAULT_WIDTHS, kind: MAX_WIDTH, modified: 200 });
  });
});
