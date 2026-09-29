/**
 * Remembers the session between runs when "Restore the last session" is on: the layout soon
 * after it changes, and every pane's recent scrollback when the window goes away (and every
 * so often, in case it never gets the chance). Turning the setting off forgets both.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';

import type { SessionRegistry } from '../engine/session-registry';
import type { LayoutState } from '../model/layout.reducer';
import { forgetLayout, RESTORED_LINES, saveLayout, saveScrollback } from './session.util';

const LAYOUT_DELAY_MS = 400;
const SCROLLBACK_EVERY_MS = 30_000;

function snapshot(registry: SessionRegistry): Map<string, string> {
  const panes = new Map<string, string>();
  for (const id of registry.ids()) {
    const text = registry.get(id)?.serialize(RESTORED_LINES);
    if (text !== undefined && text !== '') panes.set(id, text);
  }
  return panes;
}

export function usePersistence(
  layout: LayoutState,
  registry: SessionRegistry,
  enabled: boolean,
): void {
  const latest = useRef(layout);
  useLayoutEffect(() => {
    latest.current = layout;
  });

  useEffect(() => {
    const cwdOf = (paneId: string) => registry.store.get(paneId)?.cwd ?? null;
    if (!enabled) {
      forgetLayout();
      saveScrollback(new Map());
      return;
    }
    const timer = setTimeout(() => saveLayout(layout, cwdOf), LAYOUT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [layout, registry, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const save = () => {
      saveLayout(latest.current, (paneId) => registry.store.get(paneId)?.cwd ?? null);
      saveScrollback(snapshot(registry));
    };
    const timer = setInterval(save, SCROLLBACK_EVERY_MS);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', save);
    };
  }, [registry, enabled]);
}
