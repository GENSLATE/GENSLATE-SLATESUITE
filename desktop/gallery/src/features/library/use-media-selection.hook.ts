import type { KeyboardEvent, MouseEvent } from 'react';

import { useGallery } from '../../app/gallery.context';
import type { Block, Layout } from '../../model/layout.util';
import { EMPTY_SELECTION, moveFocus, selectItem } from '../../model/selection.util';

/** The id straight above or below `id` (the cell whose centre is closest). */
function verticalNeighbour(layout: Layout, id: number, delta: 1 | -1): number | null {
  const rowIndex = layout.rowOf.get(id);
  if (rowIndex === undefined) return null;
  const row = layout.blocks[rowIndex];
  const cell = row?.type === 'row' ? row.cells.find((candidate) => candidate.item.id === id) : null;
  if (cell == null) return null;
  const centre = cell.left + cell.width / 2;
  for (let index = rowIndex + delta; index >= 0 && index < layout.blocks.length; index += delta) {
    const next: Block | undefined = layout.blocks[index];
    if (next?.type !== 'row') continue;
    let best = next.cells[0];
    for (const candidate of next.cells) {
      const distance = Math.abs(candidate.left + candidate.width / 2 - centre);
      if (best === undefined || distance < Math.abs(best.left + best.width / 2 - centre)) {
        best = candidate;
      }
    }
    return best?.item.id ?? null;
  }
  return null;
}

/** Scrolls `element` so the row holding `id` is fully visible. */
export function revealItem(element: HTMLElement | null, layout: Layout, id: number, offset = 0) {
  const rowIndex = layout.rowOf.get(id);
  const block = rowIndex === undefined ? undefined : layout.blocks[rowIndex];
  if (element === null || block === undefined) return;
  const top = block.top + offset;
  const bottom = top + block.height;
  // Leave room for a date header above the first row of a section.
  if (top - 40 < element.scrollTop) element.scrollTop = Math.max(0, top - 40);
  else if (bottom + 8 > element.scrollTop + element.clientHeight) {
    element.scrollTop = bottom + 8 - element.clientHeight;
  }
}

/**
 * Desktop selection over a laid-out view: click selects, Ctrl/⌘-click toggles, Shift-click
 * extends; double-click opens; arrows move in two dimensions (Shift extends), Space toggles,
 * Escape clears.
 */
export function useMediaSelection(layout: Layout, element: () => HTMLElement | null, offset = 0) {
  const api = useGallery();
  const { selection, select } = api;
  const order = layout.order;

  const focusOn = (id: number, range: boolean, toggle: boolean) => {
    select(
      toggle && !range
        ? { ...selection, focus: id }
        : selectItem(selection, order, id, { range, toggle }),
    );
    revealItem(element(), layout, id, offset);
  };

  return {
    onItemClick(event: MouseEvent, id: number) {
      const toggle = event.metaKey || event.ctrlKey;
      select(selectItem(selection, order, id, { range: event.shiftKey, toggle }));
    },
    /** The corner check toggles without clearing the rest. */
    onItemCheck(id: number) {
      select(selectItem(selection, order, id, { range: false, toggle: true }));
    },
    /** A right-click on an unselected item selects just it (the menu acts on the selection). */
    onItemMenu(id: number) {
      if (!selection.selected.includes(id)) select({ selected: [id], anchor: id, focus: id });
    },
    onItemOpen(id: number) {
      api.openViewer(id);
    },
    onBackgroundClick(event: MouseEvent) {
      if (
        event.target === event.currentTarget &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        select(EMPTY_SELECTION);
      }
    },
    onKeyDown(event: KeyboardEvent) {
      const range = event.shiftKey;
      const toggle = event.metaKey || event.ctrlKey;
      const focus = selection.focus;
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowRight': {
          event.preventDefault();
          const next = moveFocus(selection, order, event.key === 'ArrowRight' ? 1 : -1, {
            range,
            toggle,
          });
          select(next);
          if (next.focus !== null) revealItem(element(), layout, next.focus, offset);
          return;
        }
        case 'ArrowUp':
        case 'ArrowDown': {
          event.preventDefault();
          const first = event.key === 'ArrowDown' ? order[0] : order.at(-1);
          const target =
            focus === null
              ? (first ?? null)
              : verticalNeighbour(layout, focus, event.key === 'ArrowDown' ? 1 : -1);
          if (target !== null) focusOn(target, range, toggle);
          return;
        }
        case 'Home':
        case 'End': {
          event.preventDefault();
          const target = event.key === 'Home' ? order[0] : order.at(-1);
          if (target !== undefined) focusOn(target, range, false);
          return;
        }
        case ' ': {
          if (focus === null) return;
          event.preventDefault();
          select(selectItem(selection, order, focus, { range: false, toggle: true }));
          return;
        }
        case 'Escape': {
          if (selection.selected.length === 0) return;
          event.preventDefault();
          select(EMPTY_SELECTION);
          return;
        }
        default:
      }
    },
  };
}
