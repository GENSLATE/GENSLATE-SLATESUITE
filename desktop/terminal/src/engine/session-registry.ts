/**
 * Every pane's `TerminalSession`, keyed by pane id. The layout decides which panes exist;
 * `prune()` ends the shells of panes that are gone.
 */
import type { Profile } from '../ipc/terminal.types';
import { PaneStore } from './pane-store';
import { type SessionHost, type TerminalLook, TerminalSession } from './terminal-session';

export class SessionRegistry {
  readonly store: PaneStore;
  readonly #sessions = new Map<string, TerminalSession>();
  readonly #host: SessionHost;
  #look: TerminalLook;

  constructor(host: Omit<SessionHost, 'store'>, look: TerminalLook, store = new PaneStore()) {
    this.store = store;
    this.#host = { ...host, store };
    this.#look = look;
  }

  get(id: string): TerminalSession | undefined {
    return this.#sessions.get(id);
  }

  /** The session for pane `id`, created (not yet started) on first use. */
  ensure(id: string, profile: Profile, cwd: string | null, restored: string | null) {
    const existing = this.#sessions.get(id);
    if (existing !== undefined) return existing;
    const session = new TerminalSession(id, profile, cwd, this.#look, this.#host, restored);
    this.#sessions.set(id, session);
    return session;
  }

  ids(): readonly string[] {
    return [...this.#sessions.keys()];
  }

  setLook(look: TerminalLook): void {
    this.#look = look;
    for (const session of this.#sessions.values()) session.setLook(look);
  }

  /** Ends and forgets every session whose pane is no longer in `live`. */
  prune(live: ReadonlySet<string>): void {
    for (const [id, session] of this.#sessions) {
      if (live.has(id)) continue;
      session.dispose();
      this.#sessions.delete(id);
    }
  }

  disposeAll(): void {
    this.prune(new Set());
  }
}
