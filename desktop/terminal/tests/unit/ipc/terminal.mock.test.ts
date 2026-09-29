import { describe, expect, test } from 'bun:test';

import { createMockBackend } from '../../../src/ipc/terminal.mock';
import type { HistoryEntry } from '../../../src/ipc/terminal.types';

const decoder = new TextDecoder();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('browser backend', () => {
  test('a mock shell greets, runs a command and records it in history', async () => {
    const backend = createMockBackend();
    const commands: HistoryEntry[] = [];
    const stop = await backend.subscribe({
      exit: () => undefined,
      command: (_id, entry) => commands.push(entry),
      filesChanged: () => undefined,
      open: () => undefined,
    });
    let output = '';
    const context = await backend.context();
    const info = await backend.spawn(
      { id: 'p1', profileId: context.defaultProfileId, cwd: null, cols: 100, rows: 30 },
      (bytes) => {
        output += decoder.decode(bytes);
      },
    );
    expect(info.shellName).toBe('PowerShell');
    await wait(120);
    expect(output).toContain('\x1b]133;A');

    await backend.write('p1', new TextEncoder().encode('bun --version\r'));
    await wait(300);
    expect(output).toContain('1.4.2');
    expect(commands.map((entry) => entry.command)).toEqual(['bun --version']);

    const found = await backend.searchHistory({
      query: 'bun --v',
      cwd: null,
      failedOnly: false,
      limit: 5,
    });
    expect(found[0]?.command).toBe('bun --version');
    stop();
  });

  test('snippets need a name and a command, and get unique ids', async () => {
    const backend = createMockBackend();
    const draft = {
      id: null,
      name: 'Deploy',
      command: 'bun run deploy',
      description: '',
      run: false,
    };
    const first = await backend.saveSnippet(draft);
    const second = await backend.saveSnippet(draft);
    const ids = second.filter((snippet) => snippet.name === 'Deploy').map((snippet) => snippet.id);
    expect(ids).toEqual(['deploy', 'deploy-2']);
    expect(first.length + 1).toBe(second.length);
    await expect(backend.saveSnippet({ ...draft, command: ' ' })).rejects.toThrow();
  });
});
