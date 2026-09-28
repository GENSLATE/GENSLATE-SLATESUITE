/**
 * Multi-selection over an ordered list of paths, the way desktop file managers do it: click
 * selects one, Ctrl/⌘-click toggles, Shift-click (and Shift+arrows) extends from the anchor.
 */

export interface Selection {
  readonly selected: readonly string[];
  /** Where Shift-ranges start. */
  readonly anchor: string | null;
  /** The keyboard cursor. */
  readonly focus: string | null;
}

export const EMPTY_SELECTION: Selection = { selected: [], anchor: null, focus: null };

export interface SelectModifiers {
  /** Shift: extend from the anchor. */
  readonly range: boolean;
  /** Ctrl (⌘ on macOS): toggle one item. */
  readonly toggle: boolean;
}

/** Selection after clicking (or arrowing to) `target`. */
export function selectItem(
  current: Selection,
  order: readonly string[],
  target: string,
  { range, toggle }: SelectModifiers,
): Selection {
  if (range && current.anchor !== null && order.includes(current.anchor)) {
    const span = between(order, current.anchor, target);
    const selected = toggle ? union(current.selected, span) : span;
    return { selected, anchor: current.anchor, focus: target };
  }
  if (toggle) {
    const selected = current.selected.includes(target)
      ? current.selected.filter((path) => path !== target)
      : [...current.selected, target];
    return { selected, anchor: target, focus: target };
  }
  return { selected: [target], anchor: target, focus: target };
}

/** Moves the keyboard cursor by `delta` rows (clamped); Shift extends, Ctrl only moves focus. */
export function moveFocus(
  current: Selection,
  order: readonly string[],
  delta: number,
  modifiers: SelectModifiers,
): Selection {
  if (order.length === 0) return current;
  const from = current.focus === null ? -1 : order.indexOf(current.focus);
  const start = from === -1 ? (delta > 0 ? -1 : order.length) : from;
  const index = Math.min(order.length - 1, Math.max(0, start + delta));
  const target = order[index] ?? order[0];
  if (target === undefined) return current;
  if (modifiers.toggle && !modifiers.range) return { ...current, focus: target };
  return selectItem(current, order, target, modifiers);
}

export function selectAll(order: readonly string[]): Selection {
  return { selected: [...order], anchor: order[0] ?? null, focus: order.at(-1) ?? null };
}

export function invertSelection(current: Selection, order: readonly string[]): Selection {
  const selected = order.filter((path) => !current.selected.includes(path));
  return { selected, anchor: selected[0] ?? null, focus: selected.at(-1) ?? null };
}

/** Keeps only paths still in `order` (after a refresh, delete or filter). */
export function pruneSelection(current: Selection, order: readonly string[]): Selection {
  const present = new Set(order);
  const selected = current.selected.filter((path) => present.has(path));
  if (
    selected.length === current.selected.length &&
    (current.focus === null || present.has(current.focus))
  ) {
    return current;
  }
  return {
    selected,
    anchor: current.anchor !== null && present.has(current.anchor) ? current.anchor : null,
    focus: current.focus !== null && present.has(current.focus) ? current.focus : null,
  };
}

function between(order: readonly string[], a: string, b: string): string[] {
  const from = order.indexOf(a);
  const to = order.indexOf(b);
  if (to === -1) return [a];
  return order.slice(Math.min(from, to), Math.max(from, to) + 1);
}

function union(a: readonly string[], b: readonly string[]): string[] {
  return [...new Set([...a, ...b])];
}
