import type { ExplorerBackend } from './explorer.client';
import type { ExplorerEvents } from './explorer.types';

const IGNORE: ExplorerEvents = {
  progress: () => undefined,
  taskDone: () => undefined,
  searchResults: () => undefined,
  searchDone: () => undefined,
  changed: () => undefined,
  undo: () => undefined,
};

/**
 * Subscribes to some backend events from an effect; returns the cleanup. Without events (a
 * failed subscription) the UI still refreshes after each of its own operations.
 */
export function listenTo(backend: ExplorerBackend, handlers: Partial<ExplorerEvents>): () => void {
  let active = true;
  let stop: (() => void) | undefined;
  backend.subscribe({ ...IGNORE, ...handlers }).then(
    (unsubscribe) => {
      if (active) stop = unsubscribe;
      else unsubscribe();
    },
    (error: unknown) => console.warn('explorer events unavailable', error),
  );
  return () => {
    active = false;
    stop?.();
  };
}
