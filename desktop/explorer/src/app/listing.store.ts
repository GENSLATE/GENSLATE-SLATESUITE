/**
 * Folder listings, cached by path, as an external store (`useSyncExternalStore`): loads are
 * started from events and effects, and the latest request per folder wins.
 */
import type { ExplorerBackend } from '../ipc/explorer.client';
import type { Listing } from '../ipc/explorer.types';

/** A folder as the views see it: loading (keeping the last listing), loaded, or failed. */
export type ListingState =
  | { readonly status: 'loading'; readonly listing: Listing | null }
  | { readonly status: 'ready'; readonly listing: Listing }
  | { readonly status: 'error'; readonly error: string; readonly listing: null };

const messageOf = (error: unknown) =>
  typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : String(error);

export class ListingStore {
  private cache: ReadonlyMap<string, ListingState> = new Map();
  private readonly tickets = new Map<string, number>();
  private readonly listeners = new Set<() => void>();
  private readonly backend: ExplorerBackend;
  private showHidden: boolean;

  constructor(backend: ExplorerBackend, showHidden: boolean) {
    this.backend = backend;
    this.showHidden = showHidden;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** The whole cache; a new map after every change. */
  readonly snapshot = (): ReadonlyMap<string, ListingState> => this.cache;

  /** Loads `path` unless it is cached (always, with `force`). */
  load(path: string, force = false): void {
    const current = this.cache.get(path);
    if (!force && current !== undefined && current.status !== 'error') return;
    const ticket = (this.tickets.get(path) ?? 0) + 1;
    this.tickets.set(path, ticket);
    this.set(path, { status: 'loading', listing: current?.listing ?? null });
    this.backend.listDir(path, this.showHidden).then(
      (listing) => {
        if (this.tickets.get(path) === ticket) this.set(path, { status: 'ready', listing });
      },
      (error: unknown) => {
        if (this.tickets.get(path) === ticket) {
          this.set(path, { status: 'error', error: messageOf(error), listing: null });
        }
      },
    );
  }

  /** Reloads the cached folders among `paths`. */
  refresh(paths: Iterable<string>): void {
    for (const path of paths) if (this.cache.has(path)) this.load(path, true);
  }

  /** Reloads everything cached (after Undo, or when hidden files are toggled). */
  reloadAll(): void {
    this.refresh([...this.cache.keys()]);
  }

  setShowHidden(showHidden: boolean): void {
    if (showHidden === this.showHidden) return;
    this.showHidden = showHidden;
    this.reloadAll();
  }

  private set(path: string, state: ListingState): void {
    this.cache = new Map(this.cache).set(path, state);
    for (const listener of this.listeners) listener();
  }
}
