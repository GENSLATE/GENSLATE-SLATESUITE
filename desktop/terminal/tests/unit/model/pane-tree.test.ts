import { describe, expect, test } from 'bun:test';

import {
  equalize,
  layoutRects,
  leaves,
  neighbor,
  type PaneLeaf,
  type PaneNode,
  removeLeaf,
  setRatio,
  splitHandles,
  splitLeaf,
} from '../../../src/model/pane-tree.util';

const pane = (id: string): PaneLeaf => ({ type: 'pane', id, profileId: 'pwsh', cwd: null });

/** a | (b over c) */
function threePanes(): PaneNode {
  const right = splitLeaf(pane('a'), 'a', 'row', pane('b'), 's1');
  return splitLeaf(right, 'b', 'column', pane('c'), 's2');
}

describe('pane tree', () => {
  test('splitting puts the new pane after the old one', () => {
    const root = threePanes();
    expect(leaves(root).map((leaf) => leaf.id)).toEqual(['a', 'b', 'c']);
    expect(layoutRects(root).get('a')).toEqual({ x: 0, y: 0, w: 0.5, h: 1 });
    expect(layoutRects(root).get('c')).toEqual({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
  });

  test('splitting an unknown pane changes nothing', () => {
    const root = threePanes();
    expect(splitLeaf(root, 'nope', 'row', pane('d'), 's3')).toBe(root);
  });

  test('closing a pane lets its sibling take the space', () => {
    const root = threePanes();
    const without = removeLeaf(root, 'b');
    expect(without === null ? [] : leaves(without).map((leaf) => leaf.id)).toEqual(['a', 'c']);
    expect(without === null ? null : layoutRects(without).get('c')).toEqual({
      x: 0.5,
      y: 0,
      w: 0.5,
      h: 1,
    });
    expect(removeLeaf(pane('a'), 'a')).toBeNull();
  });

  test('ratios are clamped and equalize resets them', () => {
    const root = setRatio(threePanes(), 's1', 0.02);
    expect(root.type === 'split' ? root.ratio : null).toBe(0.1);
    const even = equalize(setRatio(root, 's2', 0.8));
    expect(splitHandles(even).map((handle) => handle.ratio)).toEqual([0.5, 0.5]);
  });

  test('split handles cover each split’s own area, outermost first', () => {
    const [outer, inner] = splitHandles(threePanes());
    expect(outer).toMatchObject({ id: 's1', direction: 'row', area: { x: 0, y: 0, w: 1, h: 1 } });
    expect(inner).toMatchObject({
      id: 's2',
      direction: 'column',
      area: { x: 0.5, y: 0, w: 0.5, h: 1 },
    });
  });

  test('neighbours follow the layout', () => {
    const root = threePanes();
    expect(neighbor(root, 'a', 'right')).toBe('b');
    expect(neighbor(root, 'b', 'down')).toBe('c');
    expect(neighbor(root, 'c', 'up')).toBe('b');
    expect(neighbor(root, 'c', 'left')).toBe('a');
    expect(neighbor(root, 'a', 'left')).toBeNull();
  });
});
