import { describe, expect, test } from 'bun:test';

import {
  EMPTY_SELECTION,
  invertSelection,
  moveFocus,
  pruneSelection,
  selectAll,
  selectItem,
} from '../../../src/model/selection.util';

const ORDER = ['a', 'b', 'c', 'd', 'e'];
const PLAIN = { range: false, toggle: false };

describe('selection', () => {
  test('a click selects one item and sets the anchor', () => {
    expect(selectItem(EMPTY_SELECTION, ORDER, 'b', PLAIN)).toEqual({
      selected: ['b'],
      anchor: 'b',
      focus: 'b',
    });
  });

  test('Shift extends from the anchor, Ctrl toggles', () => {
    const start = selectItem(EMPTY_SELECTION, ORDER, 'b', PLAIN);
    const range = selectItem(start, ORDER, 'd', { range: true, toggle: false });
    expect(range.selected).toEqual(['b', 'c', 'd']);
    expect(range.anchor).toBe('b');
    const toggled = selectItem(range, ORDER, 'c', { range: false, toggle: true });
    expect(toggled.selected).toEqual(['b', 'd']);
    const added = selectItem(toggled, ORDER, 'e', { range: false, toggle: true });
    expect(added.selected).toEqual(['b', 'd', 'e']);
  });

  test('arrows move and clamp; Shift+arrows extend; Ctrl+arrows only move the cursor', () => {
    const at = selectItem(EMPTY_SELECTION, ORDER, 'b', PLAIN);
    expect(moveFocus(at, ORDER, 1, PLAIN).selected).toEqual(['c']);
    expect(moveFocus(at, ORDER, -10, PLAIN).selected).toEqual(['a']);
    expect(moveFocus(at, ORDER, 2, { range: true, toggle: false }).selected).toEqual([
      'b',
      'c',
      'd',
    ]);
    const cursor = moveFocus(at, ORDER, 1, { range: false, toggle: true });
    expect(cursor.selected).toEqual(['b']);
    expect(cursor.focus).toBe('c');
  });

  test('the first arrow press starts at an end', () => {
    expect(moveFocus(EMPTY_SELECTION, ORDER, 1, PLAIN).selected).toEqual(['a']);
    expect(moveFocus(EMPTY_SELECTION, ORDER, -1, PLAIN).selected).toEqual(['e']);
  });

  test('select all, invert and prune', () => {
    expect(selectAll(ORDER).selected).toEqual(ORDER);
    expect(
      invertSelection({ selected: ['a', 'c'], anchor: 'a', focus: 'c' }, ORDER).selected,
    ).toEqual(['b', 'd', 'e']);
    const pruned = pruneSelection({ selected: ['a', 'x'], anchor: 'x', focus: 'a' }, ORDER);
    expect(pruned).toEqual({ selected: ['a'], anchor: null, focus: 'a' });
    const kept = { selected: ['a'], anchor: 'a', focus: 'a' };
    expect(pruneSelection(kept, ORDER)).toBe(kept);
  });
});
