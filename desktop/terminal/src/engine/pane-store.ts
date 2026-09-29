/**
 * Live state of every pane (title, folder, running command, exit…), kept outside React so a
 * busy shell doesn't re-render the window on every byte. Components read it with
 * `usePaneStates()` / `usePaneState(id)`; sessions write it with `update()`.
 */
import { useSyncExternalStore } from 'react';

export type PaneStatus = 'starting' | 'running' | 'exited' | 'failed';

/** A finished command, as the status bar and panels show it. */
export interface FinishedCommand {
  readonly command: string;
  readonly exitCode: number | null;
  readonly durationMs: number;
  readonly finishedAt: number;
}

export interface PaneState {
  readonly status: PaneStatus;
  /** The shell's title (OSC 0/2), else the profile's name. */
  readonly title: string;
  readonly profileId: string;
  readonly shellName: string;
  readonly cwd: string | null;
  readonly pid: number | null;
  readonly exitCode: number | null;
  readonly error: string | null;
  /** A command is running (between its start and end marks). */
  readonly busy: boolean;
  /** The command running now (shell integration), else `null`. */
  readonly currentCommand: string | null;
  readonly lastCommand: FinishedCommand | null;
  /** Shell integration marks were seen. */
  readonly integrated: boolean;
  /** New output while the pane was out of sight. */
  readonly activity: boolean;
  /** The bell just rang (a short flash). */
  readonly bell: boolean;
  readonly cols: number;
  readonly rows: number;
  /** Find-in-terminal results (`null`: no search). */
  readonly search: { readonly index: number; readonly count: number } | null;
}

export function initialPaneState(profileId: string, shellName: string, cwd: string | null) {
  return {
    status: 'starting',
    title: shellName,
    profileId,
    shellName,
    cwd,
    pid: null,
    exitCode: null,
    error: null,
    busy: false,
    currentCommand: null,
    lastCommand: null,
    integrated: false,
    activity: false,
    bell: false,
    cols: 0,
    rows: 0,
    search: null,
  } satisfies PaneState;
}

type Listener = () => void;

export class PaneStore {
  #states: ReadonlyMap<string, PaneState> = new Map();
  readonly #listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  readonly snapshot = (): ReadonlyMap<string, PaneState> => this.#states;

  get(id: string): PaneState | undefined {
    return this.#states.get(id);
  }

  set(id: string, state: PaneState): void {
    const next = new Map(this.#states);
    next.set(id, state);
    this.#commit(next);
  }

  /** Merges `patch` into pane `id`; a patch that changes nothing notifies no one. */
  update(id: string, patch: Partial<PaneState>): void {
    const current = this.#states.get(id);
    if (current === undefined) return;
    let changed = false;
    for (const key of Object.keys(patch) as (keyof PaneState)[]) {
      if (current[key] !== patch[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    const next = new Map(this.#states);
    next.set(id, { ...current, ...patch });
    this.#commit(next);
  }

  delete(id: string): void {
    if (!this.#states.has(id)) return;
    const next = new Map(this.#states);
    next.delete(id);
    this.#commit(next);
  }

  #commit(next: ReadonlyMap<string, PaneState>): void {
    this.#states = next;
    for (const listener of this.#listeners) listener();
  }
}

/** Every pane's state; re-renders when any pane changes. */
export function usePaneStates(store: PaneStore): ReadonlyMap<string, PaneState> {
  return useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}

/** One pane's state; re-renders only when that pane changes. */
export function usePaneState(store: PaneStore, id: string): PaneState | undefined {
  const read = () => store.get(id);
  return useSyncExternalStore(store.subscribe, read, read);
}
