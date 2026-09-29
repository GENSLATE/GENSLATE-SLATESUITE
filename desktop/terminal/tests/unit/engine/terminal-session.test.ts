import { beforeAll, describe, expect, test } from 'bun:test';

import { PaneStore } from '../../../src/engine/pane-store';
import { type SessionHost, TerminalSession } from '../../../src/engine/terminal-session';
import type { TerminalBackend } from '../../../src/ipc/terminal.client';
import { createMockBackend } from '../../../src/ipc/terminal.mock';
import { MOCK_PROFILES } from '../../../src/ipc/terminal.mock-data';
import type { Profile, SpawnInfo } from '../../../src/ipc/terminal.types';

/** happy-dom has no canvas; xterm only needs a 2D context that measures glyphs. */
beforeAll(() => {
  const fakeContext = new Proxy(
    { measureText: (text: string) => ({ width: text.length * 8 }), canvas: {} },
    {
      get: (target, key) => (key in target ? target[key as keyof typeof target] : () => undefined),
    },
  );
  HTMLCanvasElement.prototype.getContext = function getContext(kind: string) {
    return kind === '2d' ? fakeContext : null;
  } as typeof HTMLCanvasElement.prototype.getContext;
});

const LOOK = {
  theme: 'polar-night',
  fontFamily: 'monospace',
  fontSize: 13,
  lineHeight: 1.2,
  cursorStyle: 'bar',
  cursorBlink: false,
  scrollback: 1000,
} as const;

interface Harness {
  readonly session: TerminalSession;
  readonly store: PaneStore;
  readonly killed: string[];
  readonly written: Uint8Array[];
  /** Finishes the pending spawn. */
  readonly started: () => Promise<void>;
}

function harness(): Harness {
  const profile = MOCK_PROFILES[0] as Profile;
  const killed: string[] = [];
  const written: Uint8Array[] = [];
  let finish: (info: SpawnInfo) => void = () => {};
  const spawned = new Promise<SpawnInfo>((resolve) => {
    finish = resolve;
  });
  const backend: TerminalBackend = {
    ...createMockBackend(),
    spawn: () => spawned,
    kill: (id) => {
      killed.push(id);
      return Promise.resolve();
    },
    write: (_id, bytes) => {
      written.push(bytes);
      return Promise.resolve();
    },
  };
  const store = new PaneStore();
  const host: SessionHost = {
    backend,
    store,
    platform: 'linux',
    isAppShortcut: () => false,
    onInput: () => {},
    onPaste: () => {},
    onCommandFinished: () => {},
    onNaturalLanguage: () => {},
    onExplain: () => {},
    onOpenUrl: () => {},
    onOpenPath: () => {},
    onFocus: () => {},
    copyOnSelect: () => false,
    visualBell: () => false,
  };
  const session = new TerminalSession('pane-1', profile, null, LOOK, host, null);
  session.attach(document.body.appendChild(document.createElement('div')));
  return {
    session,
    store,
    killed,
    written,
    started: async () => {
      finish({
        id: 'pane-1',
        pid: 42,
        profileId: profile.id,
        shellName: profile.name,
        cwd: '/home',
        nonce: null,
      });
      await spawned;
      await Promise.resolve();
    },
  };
}

describe('TerminalSession', () => {
  test('a pane closed while its shell starts still ends that shell', async () => {
    const { session, killed, started } = harness();
    session.dispose();
    killed.length = 0;
    await started();
    expect(killed).toEqual(['pane-1']);
  });

  test('closing a pane ends its shell even after it exited', async () => {
    const { session, store, killed, started } = harness();
    await started();
    store.update('pane-1', { status: 'exited' });
    session.dispose();
    expect(killed).toEqual(['pane-1']);
  });

  test('text and binary input reach the shell in order, byte for byte', async () => {
    const { session, store, written, started } = harness();
    await started();
    expect(store.get('pane-1')?.status).toBe('running');
    session.send('é');
    session.sendBytes(Uint8Array.of(0x1b, 0x5b, 0x4d, 0x20, 0xe8, 0x21));
    await Promise.resolve();
    await Promise.resolve();
    expect(written.flatMap((chunk) => [...chunk])).toEqual([
      0xc3, 0xa9, 0x1b, 0x5b, 0x4d, 0x20, 0xe8, 0x21,
    ]);
    session.dispose();
  });
});
