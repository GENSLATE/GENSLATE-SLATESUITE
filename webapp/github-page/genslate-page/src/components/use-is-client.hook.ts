import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False while prerendering and during hydration, true afterwards. Use it for output that depends
 * on the visitor's machine (⌘ vs Ctrl, detected OS) so hydration never mismatches.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
