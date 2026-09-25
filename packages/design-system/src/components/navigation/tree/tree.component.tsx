import { type KeyboardEvent, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../../utils/cn.util';
import type { TreeProps } from './tree.types';
import { treeVariants } from './tree.variants';
import { TreeContext, type TreeContextValue } from './tree-context';
import { useControllableState } from './use-controllable-state';

const TYPEAHEAD_RESET_MS = 500;
const EMPTY: readonly string[] = [];

/** Visible, enabled-or-not tree items in document (= visual) order. */
function visibleItems(root: HTMLElement | null): HTMLElement[] {
  return root ? [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')] : [];
}

const isDisabled = (el: HTMLElement) => el.getAttribute('aria-disabled') === 'true';

/**
 * A WAI-ARIA tree view (VS Code explorer density): 22px rows, indent guides, rotating chevrons,
 * roving tabindex, single selection, and full keyboard support — ↑/↓ move, → expands or enters,
 * ← collapses or goes to the parent, Home/End, Enter/Space select, and type-ahead.
 */
export function Tree({
  selected: selectedProp,
  defaultSelected = null,
  onSelect,
  onAction,
  expanded: expandedProp,
  defaultExpanded = EMPTY,
  onExpandedChange,
  selectionFollowsFocus = false,
  indentGuides = 'hover',
  className,
  labels,
  children,
  onKeyDown,
  ...props
}: TreeProps) {
  const rootRef = useRef<HTMLUListElement | null>(null);
  const [selected, setSelected] = useControllableState<string | null>(
    selectedProp,
    defaultSelected,
    (id) => {
      if (id != null) onSelect?.(id);
    },
  );
  const [expanded, setExpanded] = useControllableState<readonly string[]>(
    expandedProp,
    defaultExpanded,
    (ids) => onExpandedChange?.([...ids]),
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const typeahead = useRef({ text: '', at: 0 });

  // Seed the roving tabindex with the selection or the first item.
  useLayoutEffect(() => {
    const items = visibleItems(rootRef.current);
    const ids = items.map((el) => el.dataset['id']);
    if (focusedId != null && ids.includes(focusedId)) return;
    const first = items.find((el) => !isDisabled(el))?.dataset['id'] ?? null;
    const fallback = selected != null && ids.includes(selected) ? selected : first;
    if (fallback !== focusedId) setFocusedId(fallback);
  });

  const isExpanded = (id: string) => expanded.includes(id);

  const setOpen = (id: string, open: boolean) => {
    if (open === expanded.includes(id)) return;
    setExpanded(open ? [...expanded, id] : expanded.filter((value) => value !== id));
  };

  const focusItem = (id: string) => {
    setFocusedId(id);
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
    el?.focus();
  };

  const select = (id: string) => {
    if (id !== selected) setSelected(id);
    else onSelect?.(id);
  };

  const context: TreeContextValue = {
    selected,
    focusedId,
    isExpanded,
    toggle: (id) => {
      const open = !expanded.includes(id);
      setOpen(id, open);
      if (!open) setFocusedId(id);
    },
    select,
    focusItem,
    action: (id) => onAction?.(id),
    indentGuides,
  };

  const moveTo = (el: HTMLElement | undefined) => {
    const id = el?.dataset['id'];
    if (!id) return;
    focusItem(id);
    if (selectionFollowsFocus && !isDisabled(el)) select(id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const current = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    if (!current || event.altKey || event.ctrlKey || event.metaKey) return;
    const items = visibleItems(rootRef.current);
    const index = items.indexOf(current);
    const id = current.dataset['id'] ?? '';
    const hasChildren = current.hasAttribute('aria-expanded');
    const open = current.getAttribute('aria-expanded') === 'true';

    let handled = true;
    switch (event.key) {
      case 'ArrowDown':
        moveTo(items[index + 1]);
        break;
      case 'ArrowUp':
        moveTo(items[index - 1]);
        break;
      case 'Home':
        moveTo(items[0]);
        break;
      case 'End':
        moveTo(items.at(-1));
        break;
      case 'ArrowRight':
        if (hasChildren && !open && !isDisabled(current)) setOpen(id, true);
        else if (hasChildren && open) moveTo(items[index + 1]);
        break;
      case 'ArrowLeft':
        if (hasChildren && open) setOpen(id, false);
        else moveTo(current.parentElement?.closest<HTMLElement>('[role="treeitem"]') ?? undefined);
        break;
      case 'Enter':
        if (!isDisabled(current)) {
          select(id);
          onAction?.(id);
        }
        break;
      case ' ':
        if (!isDisabled(current)) select(id);
        break;
      case '*': {
        // Expand all siblings of the focused item (APG optional).
        const siblings = [...(current.parentElement?.children ?? [])] as HTMLElement[];
        const ids = siblings
          .filter((el) => el.hasAttribute('aria-expanded'))
          .map((el) => el.dataset['id'] ?? '');
        setExpanded([...new Set([...expanded, ...ids])]);
        break;
      }
      default:
        handled = false;
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const now = Date.now();
          const state = typeahead.current;
          state.text = now - state.at > TYPEAHEAD_RESET_MS ? event.key : state.text + event.key;
          state.at = now;
          const query = state.text.toLowerCase();
          // Search from the item after the current one (or the current one when extending the query).
          const start = state.text.length > 1 ? index : index + 1;
          const ordered = [...items.slice(start), ...items.slice(0, start)];
          const match = ordered.find((el) =>
            (el.dataset['text'] ?? '').toLowerCase().startsWith(query),
          );
          if (match) {
            moveTo(match);
            handled = true;
          }
        }
    }
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const styles = treeVariants({ indentGuides });
  return (
    <TreeContext value={context}>
      <ul
        ref={rootRef}
        role="tree"
        aria-label={
          props['aria-labelledby'] == null
            ? (props['aria-label'] ?? labels?.tree ?? 'Tree')
            : undefined
        }
        data-slot="tree"
        className={cn(styles.root(), className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </ul>
    </TreeContext>
  );
}
