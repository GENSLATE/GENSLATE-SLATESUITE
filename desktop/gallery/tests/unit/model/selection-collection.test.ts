import { describe, expect, test } from 'bun:test';

import {
  collectionKey,
  collectionTitle,
  parseCollectionKey,
  sameCollection,
} from '../../../src/model/collection.util';
import {
  EMPTY_SELECTION,
  invertSelection,
  moveFocus,
  pruneSelection,
  selectAll,
  selectItem,
} from '../../../src/model/selection.util';

const ORDER = [10, 11, 12, 13, 14];

describe('selection', () => {
  test('click selects one, Ctrl toggles, Shift extends from the anchor', () => {
    const one = selectItem(EMPTY_SELECTION, ORDER, 11, { range: false, toggle: false });
    expect(one.selected).toEqual([11]);
    const two = selectItem(one, ORDER, 13, { range: false, toggle: true });
    expect(two.selected).toEqual([11, 13]);
    const range = selectItem(one, ORDER, 13, { range: true, toggle: false });
    expect(range.selected).toEqual([11, 12, 13]);
    expect(range.anchor).toBe(11);
  });

  test('arrows move the focus and Shift+arrows extend', () => {
    const start = selectItem(EMPTY_SELECTION, ORDER, 12, { range: false, toggle: false });
    expect(moveFocus(start, ORDER, 1, { range: false, toggle: false }).selected).toEqual([13]);
    expect(moveFocus(start, ORDER, -1, { range: true, toggle: false }).selected).toEqual([11, 12]);
  });

  test('select all, invert, and pruning items that left the list', () => {
    expect(selectAll(ORDER).selected).toEqual(ORDER);
    const some = { selected: [10, 11], anchor: 10, focus: 11 };
    expect(invertSelection(some, ORDER).selected).toEqual([12, 13, 14]);
    expect(pruneSelection(some, [11, 12]).selected).toEqual([11]);
  });
});

describe('collections', () => {
  test('keys round-trip for smart collections, folders, tags and albums', () => {
    for (const collection of [
      { type: 'favorites' },
      { type: 'folder', path: '/photos/Iceland' },
      { type: 'tag', name: 'beach' },
      { type: 'album', id: 7 },
    ] as const) {
      const parsed = parseCollectionKey(collectionKey(collection));
      expect(parsed).not.toBeNull();
      if (parsed !== null) expect(sameCollection(parsed, collection)).toBe(true);
    }
    expect(parseCollectionKey('nonsense')).toBeNull();
  });

  test('titles name the collection', () => {
    expect(collectionTitle({ type: 'all' }, null)).toBe('All photos');
    expect(collectionTitle({ type: 'tag', name: 'beach' }, null)).toBe('#beach');
    expect(collectionTitle({ type: 'folder', path: '/photos/Iceland' }, null)).toBe('Iceland');
    expect(collectionTitle({ type: 'place', country: 'PT', city: 'Lisbon' }, null)).toStartWith(
      'Lisbon, ',
    );
  });
});
