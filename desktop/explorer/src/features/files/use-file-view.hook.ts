/**
 * Behaviour shared by the details list and the icon grids: selection by click, keyboard and
 * marquee, type-ahead, opening, and keeping the keyboard cursor in view.
 */
import { usePlatform } from '@genslate/design-system';
import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import { runCommand } from '../../app/commands.registry';
import { useExplorer } from '../../app/explorer.context';
import type { Entry } from '../../ipc/explorer.types';
import { moveFocus, type Selection, selectItem } from '../../model/selection.util';
import { type Box, type FileLayout, itemsIn, scrollToReveal } from './file-layout.util';

interface Marquee {
  readonly startX: number;
  readonly startY: number;
  readonly x: number;
  readonly y: number;
  /** The selection when the drag started (kept with Ctrl/⌘). */
  readonly base: readonly string[];
  readonly additive: boolean;
}

const TYPE_AHEAD_RESET = 800;

export function marqueeBox(marquee: Marquee): Box {
  return {
    x: Math.min(marquee.startX, marquee.x),
    y: Math.min(marquee.startY, marquee.y),
    width: Math.abs(marquee.x - marquee.startX),
    height: Math.abs(marquee.y - marquee.startY),
  };
}

interface FileViewOptions {
  readonly layout: FileLayout;
  /** The scroll container (for paging and scrolling the cursor into view). */
  readonly element: () => HTMLDivElement | null;
  /** Height of sticky content over the rows (the details header). */
  readonly stickyTop: number;
}

export function useFileView({ layout, element, stickyTop }: FileViewOptions) {
  const api = useExplorer();
  const platform = usePlatform();
  const mac = platform === 'macos';
  const { visible, tab } = api;
  const order = visible.map((entry) => entry.path);
  const selected = new Set(tab.selection.selected);
  const focusIndex = tab.selection.focus === null ? -1 : order.indexOf(tab.selection.focus);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const typeAhead = useRef({ text: '', at: 0 });
  // A press on an already-selected item keeps the group (to drag it); the click narrows it.
  const pendingNarrow = useRef<string | null>(null);

  const select = (selection: Selection) => api.select(selection);
  const modifiers = (event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => ({
    range: event.shiftKey,
    toggle: mac ? event.metaKey : event.ctrlKey,
  });

  // Keep the keyboard cursor visible when it moves (not on every render: that would fight
  // the user's scrolling).
  const reveal = useEffectEvent((focus: string | null) => {
    const node = element();
    const index = focus === null ? -1 : order.indexOf(focus);
    if (node === null || index === -1) return;
    const next = scrollToReveal(layout, index, node.scrollTop, node.clientHeight, stickyTop);
    if (next !== node.scrollTop) node.scrollTop = next;
  });
  useEffect(() => reveal(tab.selection.focus), [tab.selection.focus]);

  function openEntries(entries: readonly Entry[], inNewTab: boolean) {
    const folders = entries.filter((entry) => entry.isDir);
    const files = entries.filter((entry) => !entry.isDir);
    if (inNewTab) {
      for (const folder of folders) api.newTab(folder.path, false);
      return;
    }
    for (const file of files) api.open(file);
    const [folder] = folders;
    if (files.length === 0 && folder !== undefined) api.open(folder);
  }

  function pageRows() {
    const node = element();
    const height = node?.clientHeight ?? 0;
    return Math.max(1, Math.floor((height - stickyTop) / layout.rowHeight) - 1);
  }

  function typeToSelect(key: string) {
    const now = Date.now();
    const state = typeAhead.current;
    state.text = now - state.at > TYPE_AHEAD_RESET ? key : state.text + key;
    state.at = now;
    const needle = state.text.toLowerCase();
    // Repeating one letter cycles through the names starting with it.
    const cycling = needle.length > 1 && [...needle].every((char) => char === needle[0]);
    const prefix = cycling ? needle.slice(0, 1) : needle;
    const start = cycling || needle.length === 1 ? focusIndex + 1 : Math.max(0, focusIndex);
    for (let step = 0; step < visible.length; step += 1) {
      const entry = visible[(start + step) % visible.length];
      if (entry?.name.toLowerCase().startsWith(prefix)) {
        select({ selected: [entry.path], anchor: entry.path, focus: entry.path });
        return;
      }
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    const mods = modifiers(event);
    const mod = mac ? event.metaKey : event.ctrlKey;
    const move = (delta: number) => {
      event.preventDefault();
      select(moveFocus(tab.selection, order, delta, mods));
    };
    switch (event.key) {
      case 'ArrowDown':
        if (mac && event.metaKey) {
          event.preventDefault();
          openEntries(api.selected, false);
          return;
        }
        return move(layout.columns);
      case 'ArrowUp':
        if (mac && event.metaKey) {
          event.preventDefault();
          runCommand('up', api);
          return;
        }
        return move(-layout.columns);
      case 'ArrowRight':
        return layout.columns > 1 ? move(1) : undefined;
      case 'ArrowLeft':
        return layout.columns > 1 ? move(-1) : undefined;
      case 'Home':
        return move(-order.length);
      case 'End':
        return move(order.length);
      case 'PageDown':
        return move(pageRows() * layout.columns);
      case 'PageUp':
        return move(-pageRows() * layout.columns);
      case 'Enter':
        if (event.altKey) return;
        event.preventDefault();
        openEntries(api.selected, mod);
        return;
      case 'Backspace':
        event.preventDefault();
        if (mac && event.metaKey) runCommand('trash', api);
        else if (!mac) runCommand('back', api);
        return;
      case 'Escape':
        if (tab.filter !== '') api.dispatch({ type: 'filter', filter: '' });
        else if (tab.search !== null) api.clearSearch();
        else if (tab.selection.selected.length > 0) {
          select({ ...tab.selection, selected: [], anchor: null });
        } else return;
        event.preventDefault();
        return;
      case ' ': {
        event.preventDefault();
        const focus = tab.selection.focus;
        if (focus !== null)
          select(selectItem(tab.selection, order, focus, { range: false, toggle: mod }));
        return;
      }
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          typeToSelect(event.key);
        }
    }
  }

  function itemHandlers(entry: Entry) {
    return {
      onMouseDown(event: MouseEvent<HTMLElement>) {
        if (event.button !== 0) return;
        const mods = modifiers(event);
        if (!mods.range && !mods.toggle && selected.has(entry.path)) {
          pendingNarrow.current = entry.path;
          select({ ...tab.selection, anchor: entry.path, focus: entry.path });
          return;
        }
        pendingNarrow.current = null;
        select(selectItem(tab.selection, order, entry.path, mods));
      },
      onClick() {
        if (pendingNarrow.current === entry.path) {
          select({ selected: [entry.path], anchor: entry.path, focus: entry.path });
        }
        pendingNarrow.current = null;
      },
      onDoubleClick(event: MouseEvent<HTMLElement>) {
        if (event.button !== 0) return;
        openEntries([entry], false);
      },
      onAuxClick(event: MouseEvent<HTMLElement>) {
        // Middle-click opens a folder in a new tab.
        if (event.button === 1 && entry.isDir) api.newTab(entry.path, false);
      },
      onContextMenu() {
        if (!selected.has(entry.path)) {
          select({ selected: [entry.path], anchor: entry.path, focus: entry.path });
        }
      },
      onDragStart() {
        // The drag took over; the click that follows must not narrow the selection.
        pendingNarrow.current = null;
      },
    };
  }

  /** Content coordinates of a pointer event inside the scroll container. */
  function contentPoint(event: PointerEvent<HTMLElement>) {
    const node = element();
    if (node === null) return null;
    const rect = node.getBoundingClientRect();
    return {
      x: event.clientX - rect.left + node.scrollLeft,
      y: event.clientY - rect.top + node.scrollTop,
    };
  }

  const backgroundHandlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0 || event.target !== event.currentTarget) return;
      const point = contentPoint(event);
      if (point === null) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const additive = modifiers(event).toggle || event.shiftKey;
      if (!additive) select({ selected: [], anchor: null, focus: tab.selection.focus });
      setMarquee({
        startX: point.x,
        startY: point.y,
        x: point.x,
        y: point.y,
        base: additive ? tab.selection.selected : [],
        additive,
      });
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (marquee === null) return;
      const node = element();
      const point = contentPoint(event);
      if (node === null || point === null) return;
      // Scroll while dragging past the top or bottom edge.
      const rect = node.getBoundingClientRect();
      if (event.clientY > rect.bottom - 16) node.scrollTop += 16;
      else if (event.clientY < rect.top + stickyTop + 16) node.scrollTop -= 16;
      const next = { ...marquee, x: point.x, y: point.y };
      setMarquee(next);
      const hits = itemsIn(layout, order.length, marqueeBox(next))
        .map((index) => order[index])
        .filter((path): path is string => path !== undefined);
      const chosen = next.additive ? [...new Set([...next.base, ...hits])] : hits;
      select({
        selected: chosen,
        anchor: hits[0] ?? null,
        focus: hits.at(-1) ?? tab.selection.focus,
      });
    },
    onPointerUp() {
      setMarquee(null);
    },
    onPointerCancel() {
      setMarquee(null);
    },
  };

  return { order, selected, focusIndex, marquee, onKeyDown, itemHandlers, backgroundHandlers };
}
