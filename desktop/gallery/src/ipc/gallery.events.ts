import type { GalleryBackend } from './gallery.client';
import type { GalleryEvents } from './gallery.types';

const IGNORE: GalleryEvents = {
  libraryChanged: () => undefined,
  scanProgress: () => undefined,
  scanDone: () => undefined,
  taskProgress: () => undefined,
  duplicatesDone: () => undefined,
  exportDone: () => undefined,
  undo: () => undefined,
  open: () => undefined,
};

/**
 * Subscribes to some backend events from an effect; returns the cleanup. Without events (a
 * failed subscription) the UI still refreshes after each of its own operations.
 */
export function listenTo(backend: GalleryBackend, handlers: Partial<GalleryEvents>): () => void {
  let active = true;
  let stop: (() => void) | undefined;
  backend.subscribe({ ...IGNORE, ...handlers }).then(
    (unsubscribe) => {
      if (active) stop = unsubscribe;
      else unsubscribe();
    },
    (error: unknown) => console.warn('gallery events unavailable', error),
  );
  return () => {
    active = false;
    stop?.();
  };
}
