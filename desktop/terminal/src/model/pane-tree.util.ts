/**
 * A tab's panes as a binary split tree: each split holds two children side by side (`row`) or
 * stacked (`column`) with a ratio for the first. Pure functions; the reducer composes them.
 */

/** One terminal: which shell to start and where. */
export interface PaneLeaf {
  readonly type: 'pane';
  readonly id: string;
  readonly profileId: string;
  /** The starting folder (`null`: the profile's or home). */
  readonly cwd: string | null;
}

export type SplitDirection = 'row' | 'column';

export interface PaneSplit {
  readonly type: 'split';
  readonly id: string;
  readonly direction: SplitDirection;
  /** Share of the first child, between 0.1 and 0.9. */
  readonly ratio: number;
  readonly first: PaneNode;
  readonly second: PaneNode;
}

export type PaneNode = PaneLeaf | PaneSplit;

export type FocusDirection = 'left' | 'right' | 'up' | 'down';

export const MIN_RATIO = 0.1;
export const MAX_RATIO = 0.9;

export function clampRatio(ratio: number): number {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}

/** Every pane, in reading order (left to right, top to bottom). */
export function leaves(node: PaneNode): readonly PaneLeaf[] {
  return node.type === 'pane' ? [node] : [...leaves(node.first), ...leaves(node.second)];
}

export function findLeaf(node: PaneNode, id: string): PaneLeaf | null {
  return leaves(node).find((leaf) => leaf.id === id) ?? null;
}

/** Replaces the pane `id` with `replacement`. */
function replaceLeaf(node: PaneNode, id: string, replacement: PaneNode): PaneNode {
  if (node.type === 'pane') return node.id === id ? replacement : node;
  const first = replaceLeaf(node.first, id, replacement);
  const second = replaceLeaf(node.second, id, replacement);
  return first === node.first && second === node.second ? node : { ...node, first, second };
}

/** Splits pane `id`: the new pane goes after it (right of it, or below it). */
export function splitLeaf(
  node: PaneNode,
  id: string,
  direction: SplitDirection,
  pane: PaneLeaf,
  splitId: string,
): PaneNode {
  const target = findLeaf(node, id);
  if (target === null) return node;
  return replaceLeaf(node, id, {
    type: 'split',
    id: splitId,
    direction,
    ratio: 0.5,
    first: target,
    second: pane,
  });
}

/** Removes pane `id`; its sibling takes the split's place. `null` when nothing is left. */
export function removeLeaf(node: PaneNode, id: string): PaneNode | null {
  if (node.type === 'pane') return node.id === id ? null : node;
  const first = removeLeaf(node.first, id);
  const second = removeLeaf(node.second, id);
  if (first === null) return second;
  if (second === null) return first;
  return first === node.first && second === node.second ? node : { ...node, first, second };
}

export function setRatio(node: PaneNode, splitId: string, ratio: number): PaneNode {
  if (node.type === 'pane') return node;
  if (node.id === splitId) return { ...node, ratio: clampRatio(ratio) };
  const first = setRatio(node.first, splitId, ratio);
  const second = setRatio(node.second, splitId, ratio);
  return first === node.first && second === node.second ? node : { ...node, first, second };
}

/** Evens out every split (each child gets half). */
export function equalize(node: PaneNode): PaneNode {
  if (node.type === 'pane') return node;
  return { ...node, ratio: 0.5, first: equalize(node.first), second: equalize(node.second) };
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Each pane's rectangle in a unit square. */
export function layoutRects(node: PaneNode, rect: Rect = { x: 0, y: 0, w: 1, h: 1 }) {
  const out = new Map<string, Rect>();
  const visit = (current: PaneNode, area: Rect) => {
    if (current.type === 'pane') {
      out.set(current.id, area);
      return;
    }
    if (current.direction === 'row') {
      const w = area.w * current.ratio;
      visit(current.first, { ...area, w });
      visit(current.second, { ...area, x: area.x + w, w: area.w - w });
    } else {
      const h = area.h * current.ratio;
      visit(current.first, { ...area, h });
      visit(current.second, { ...area, y: area.y + h, h: area.h - h });
    }
  };
  visit(node, rect);
  return out;
}

/** A split's divider: the split's own area, its direction and where the line sits. */
export interface SplitHandle {
  readonly id: string;
  readonly direction: SplitDirection;
  readonly ratio: number;
  readonly area: Rect;
}

/** Every split's divider in a unit square (outermost first). */
export function splitHandles(node: PaneNode, area: Rect = { x: 0, y: 0, w: 1, h: 1 }) {
  const out: SplitHandle[] = [];
  const visit = (current: PaneNode, rect: Rect) => {
    if (current.type === 'pane') return;
    out.push({ id: current.id, direction: current.direction, ratio: current.ratio, area: rect });
    if (current.direction === 'row') {
      const w = rect.w * current.ratio;
      visit(current.first, { ...rect, w });
      visit(current.second, { ...rect, x: rect.x + w, w: rect.w - w });
    } else {
      const h = rect.h * current.ratio;
      visit(current.first, { ...rect, h });
      visit(current.second, { ...rect, y: rect.y + h, h: rect.h - h });
    }
  };
  visit(node, area);
  return out;
}

const EPSILON = 1e-6;

/**
 * The pane next to `id` in `direction`: among the panes touching that edge, the one that
 * overlaps it most (ties go to the one closest to its centre).
 */
export function neighbor(node: PaneNode, id: string, direction: FocusDirection): string | null {
  const rects = layoutRects(node);
  const from = rects.get(id);
  if (from === undefined) return null;
  let best: { id: string; overlap: number; distance: number } | null = null;
  for (const [candidate, rect] of rects) {
    if (candidate === id) continue;
    const horizontal = direction === 'left' || direction === 'right';
    const touches =
      direction === 'left'
        ? Math.abs(rect.x + rect.w - from.x) < EPSILON
        : direction === 'right'
          ? Math.abs(from.x + from.w - rect.x) < EPSILON
          : direction === 'up'
            ? Math.abs(rect.y + rect.h - from.y) < EPSILON
            : Math.abs(from.y + from.h - rect.y) < EPSILON;
    if (!touches) continue;
    const overlap = horizontal
      ? Math.min(from.y + from.h, rect.y + rect.h) - Math.max(from.y, rect.y)
      : Math.min(from.x + from.w, rect.x + rect.w) - Math.max(from.x, rect.x);
    if (overlap <= EPSILON) continue;
    const distance = horizontal
      ? Math.abs(rect.y + rect.h / 2 - (from.y + from.h / 2))
      : Math.abs(rect.x + rect.w / 2 - (from.x + from.w / 2));
    if (
      best === null ||
      overlap > best.overlap + EPSILON ||
      (Math.abs(overlap - best.overlap) < EPSILON && distance < best.distance)
    ) {
      best = { id: candidate, overlap, distance };
    }
  }
  return best?.id ?? null;
}
