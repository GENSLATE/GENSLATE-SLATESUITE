import { describe, expect, test } from 'bun:test';

import type { ExplorerBackend } from '../../../src/ipc/explorer.client';
import { createMockBackend } from '../../../src/ipc/explorer.mock';
import { MOCK_HOME } from '../../../src/ipc/explorer.mock-data';
import type { Entry, ExplorerEvents, TaskDone } from '../../../src/ipc/explorer.types';

const DOCS = `${MOCK_HOME}/Documents`;

async function names(backend: ExplorerBackend, path: string, showHidden = false) {
  const listing = await backend.listDir(path, showHidden);
  return listing.entries.map((entry) => entry.name);
}

function recorder() {
  const log = {
    undo: [] as (string | null)[],
    results: [] as Entry[],
    done: [] as TaskDone[],
    changed: [] as string[],
  };
  const events: ExplorerEvents = {
    progress: () => undefined,
    taskDone: (done) => log.done.push(done),
    searchResults: (_id, entries) => log.results.push(...entries),
    searchDone: () => undefined,
    changed: (folders) => log.changed.push(...folders),
    undo: (label) => log.undo.push(label),
  };
  return { log, events };
}

describe('browser mock backend', () => {
  test('lists folders and hides dotfiles unless asked', async () => {
    const backend = createMockBackend();
    const listing = await backend.listDir(MOCK_HOME, false);
    expect(listing.parent).toBe('/home');
    expect(listing.hiddenCount).toBe(2);
    expect(await names(backend, MOCK_HOME, true)).toContain('.profile');
    await expect(backend.listDir(`${DOCS}/Resume.pdf`, false)).rejects.toMatchObject({
      kind: 'not-a-folder',
    });
  });

  test('create picks a free name, and undo removes it', async () => {
    const backend = createMockBackend();
    const { log, events } = recorder();
    await backend.subscribe(events);
    await backend.createFolder(DOCS, 'New folder');
    const second = await backend.createFolder(DOCS, 'New folder');
    expect(second.name).toBe('New folder (2)');
    expect(log.undo.at(-1)).toBe('New item');
    expect(log.changed).toContain(DOCS);

    await backend.undo();
    expect(await names(backend, DOCS)).not.toContain('New folder (2)');
    await expect(backend.createFile(DOCS, 'a/b')).rejects.toMatchObject({ kind: 'invalid-name' });
  });

  test('rename moves children and refuses a taken name', async () => {
    const backend = createMockBackend();
    await backend.rename(`${DOCS}/Invoices`, 'Bills');
    expect(await names(backend, `${DOCS}/Bills`)).toHaveLength(4);
    await expect(backend.rename(`${DOCS}/Bills`, 'Projects')).rejects.toMatchObject({
      kind: 'already-exists',
    });
    await backend.undo();
    expect(await names(backend, DOCS)).toContain('Invoices');
  });

  test('trash can be undone; delete cannot', async () => {
    const backend = createMockBackend();
    await backend.trash([`${DOCS}/Invoices`]);
    expect(await names(backend, DOCS)).not.toContain('Invoices');
    await backend.undo();
    expect(await names(backend, `${DOCS}/Invoices`)).toHaveLength(4);

    await backend.deletePermanently([`${DOCS}/Resume.pdf`]);
    expect(await backend.undo()).toBeNull();
    expect(await names(backend, DOCS)).not.toContain('Resume.pdf');
  });

  test('search matches names, globs and (optionally) contents', async () => {
    const backend = createMockBackend();
    const { log, events } = recorder();
    await backend.subscribe(events);
    const query = { root: MOCK_HOME, contents: false, showHidden: false };
    await backend.startSearch('s1', { ...query, text: 'invoice' });
    expect(log.results).toHaveLength(5);
    log.results.length = 0;
    await backend.startSearch('s2', { ...query, text: '*.flac' });
    expect(log.results.map((entry) => entry.name)).toEqual([
      '01 Aurora.flac',
      '02 Polar Night.flac',
      '03 Snow Storm.flac',
    ]);
    log.results.length = 0;
    await backend.startSearch('s3', { ...query, text: 'fn main', contents: true });
    expect(log.results.map((entry) => entry.name)).toContain('main.rs');
  });

  test('copy keeps both on a conflict; move reports the targets', async () => {
    const backend = createMockBackend();
    const { log, events } = recorder();
    await backend.subscribe(events);
    const source = `${DOCS}/Resume.pdf`;
    expect(await backend.findConflicts([source], DOCS)).toEqual([]);
    await backend.startTransfer('t1', 'copy', [source], DOCS, 'keep-both');
    expect(log.done.at(-1)?.targets).toEqual([`${DOCS}/Resume (2).pdf`]);

    await backend.startTransfer('t2', 'move', [source], `${MOCK_HOME}/Desktop`, 'skip');
    expect(await names(backend, `${MOCK_HOME}/Desktop`)).toContain('Resume.pdf');
    expect(await backend.findConflicts([`${DOCS}/Resume (2).pdf`], `${MOCK_HOME}/Desktop`)).toEqual(
      [],
    );
  });
});
