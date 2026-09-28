/**
 * Geometry of the file views: items laid out in fixed-size cells, row by row (the details
 * list is one column). Rendering only the visible rows, keyboard paging and marquee hit
 * testing all work from this arithmetic instead of measuring the DOM.
 */

export interface FileLayout {
  readonly columns: number;
  /** Cell width (the full width in the details list). */
  readonly cellWidth: number;
  readonly rowHeight: number;
  /** Space above the first row (the sticky header, padding). */
  readonly top: number;
  readonly left: number;
  readonly gap: number;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A grid for cells of `cellWidth` in a viewport `width` wide. */
export function gridLayout(
  width: number,
  cell: { readonly width: number; readonly height: number },
  padding: number,
  gap: number,
): FileLayout {
  const usable = Math.max(0, width - padding * 2);
  const columns = Math.max(1, Math.floor((usable + gap) / (cell.width + gap)));
  return {
    columns,
    cellWidth: cell.width,
    rowHeight: cell.height,
    top: padding,
    left: padding,
    gap,
  };
}

export function rowCount(layout: FileLayout, count: number): number {
  return Math.ceil(count / layout.columns);
}

/** Height of the scrolled content. */
export function contentHeight(layout: FileLayout, count: number, bottom: number): number {
  return layout.top + rowCount(layout, count) * layout.rowHeight + bottom;
}

/** Item indexes to render for a viewport (with a few rows of overscan). */
export function visibleRange(
  layout: FileLayout,
  count: number,
  scrollTop: number,
  height: number,
): { readonly start: number; readonly end: number } {
  // Before the first measurement (and in tests) render a generous first page.
  const viewHeight = height > 0 ? height : 1200;
  const overscan = 4;
  const firstRow = Math.max(0, Math.floor((scrollTop - layout.top) / layout.rowHeight) - overscan);
  const lastRow = Math.ceil((scrollTop + viewHeight - layout.top) / layout.rowHeight) + overscan;
  return {
    start: Math.min(count, firstRow * layout.columns),
    end: Math.min(count, (lastRow + 1) * layout.columns),
  };
}

export function cellBox(layout: FileLayout, index: number): Box {
  const row = Math.floor(index / layout.columns);
  const column = index % layout.columns;
  return {
    x: layout.left + column * (layout.cellWidth + layout.gap),
    y: layout.top + row * layout.rowHeight,
    width: layout.cellWidth,
    height: layout.rowHeight,
  };
}

/** Indexes of the items a marquee `box` touches. */
export function itemsIn(layout: FileLayout, count: number, box: Box): number[] {
  const hits: number[] = [];
  const firstRow = Math.max(0, Math.floor((box.y - layout.top) / layout.rowHeight));
  const lastRow = Math.floor((box.y + box.height - layout.top) / layout.rowHeight);
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = 0; column < layout.columns; column += 1) {
      const index = row * layout.columns + column;
      if (index >= count) return hits;
      const cell = cellBox(layout, index);
      const overlaps =
        cell.x < box.x + box.width &&
        cell.x + cell.width > box.x &&
        cell.y < box.y + box.height &&
        cell.y + cell.height > box.y;
      if (overlaps) hits.push(index);
    }
  }
  return hits;
}

/** The scroll position that brings item `index` into view (unchanged when it already is). */
export function scrollToReveal(
  layout: FileLayout,
  index: number,
  scrollTop: number,
  height: number,
  stickyTop: number,
): number {
  const cell = cellBox(layout, index);
  if (cell.y - stickyTop < scrollTop) return Math.max(0, cell.y - stickyTop);
  if (cell.y + cell.height > scrollTop + height) return cell.y + cell.height - height;
  return scrollTop;
}
