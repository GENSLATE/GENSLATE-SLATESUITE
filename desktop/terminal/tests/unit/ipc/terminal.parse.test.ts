import { describe, expect, test } from 'bun:test';

import {
  PayloadError,
  parseContext,
  parseGitInfo,
  parseHistory,
  parseSettings,
} from '../../../src/ipc/terminal.parse';
import { DEFAULT_SETTINGS } from '../../../src/ipc/terminal.types';

describe('IPC payloads', () => {
  test('settings use config.toml keys and fall back per key', () => {
    const settings = parseSettings({
      'font-size': 15,
      'cursor-style': 'bar',
      'right-click': 'paste',
      'copy-on-select': 'yes',
      scrollback: Number.NaN,
    });
    expect(settings.fontSize).toBe(15);
    expect(settings.cursorStyle).toBe('bar');
    expect(settings.rightClick).toBe('paste');
    expect(settings.copyOnSelect).toBe(DEFAULT_SETTINGS.copyOnSelect);
    expect(settings.scrollback).toBe(DEFAULT_SETTINGS.scrollback);
  });

  test('a context with an unknown profile icon or kind still parses', () => {
    const context = parseContext({
      platform: 'windows',
      home: 'C:\\Users\\you',
      defaultProfileId: 'pwsh',
      settings: {},
      profiles: [
        {
          id: 'pwsh',
          name: 'PowerShell',
          command: 'pwsh.exe',
          args: ['-NoLogo'],
          cwd: null,
          icon: 'sparkles',
          color: null,
          kind: 'future-shell',
          source: 'detected',
        },
      ],
    });
    expect(context.profiles[0]).toMatchObject({ icon: 'terminal', kind: 'other', color: null });
    expect(context.snippets).toEqual([]);
    expect(context.historyEnabled).toBe(false);
  });

  test('malformed payloads fail loudly at the edge', () => {
    expect(() => parseHistory([{ id: 'one', command: 'ls', startedAt: 1 }])).toThrow(PayloadError);
    expect(() => parseContext(null)).toThrow(PayloadError);
  });

  test('no repository is null', () => {
    expect(parseGitInfo(null)).toBeNull();
    expect(parseGitInfo({ root: '/r', branch: null, head: 'abc1234' })).toEqual({
      root: '/r',
      branch: null,
      head: 'abc1234',
      changes: 0,
    });
  });
});
