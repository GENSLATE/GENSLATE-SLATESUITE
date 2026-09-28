import { describe, expect, test } from 'bun:test';

import {
  PayloadError,
  parseContext,
  parseEntries,
  parseListing,
  parseSettings,
  parseStrings,
} from '../../../src/ipc/explorer.parse';

const ENTRY = {
  name: 'a.txt',
  path: '/a.txt',
  isDir: false,
  kind: 'text',
  extension: 'txt',
  size: 3,
  modified: null,
  created: null,
  hidden: false,
  readonly: false,
  symlink: false,
} as const;

describe('IPC payload parsing', () => {
  test('entries and listings', () => {
    expect(parseEntries([ENTRY])).toEqual([ENTRY]);
    expect(() => parseEntries([{ ...ENTRY, isDir: 'no' }])).toThrow(PayloadError);
    expect(() => parseEntries({})).toThrow('Unexpected entries from the explorer backend');

    const listing = parseListing({ path: '/', name: '/', entries: [ENTRY] });
    expect(listing.parent).toBeNull();
    expect(listing.hiddenCount).toBe(0);
    expect(() => parseListing({ name: '/', entries: [] })).toThrow(PayloadError);
  });

  test('settings use config.toml keys and fall back to defaults', () => {
    const settings = parseSettings({ view: 'tiles', 'sort-by': 'bogus', 'show-hidden': true });
    expect(settings.view).toBe('tiles');
    expect(settings.sortBy).toBe('name');
    expect(settings.showHidden).toBe(true);
    expect(settings.foldersFirst).toBe(true);
    expect(settings.startFolder).toBe('home');
  });

  test('context requires places and a start folder', () => {
    const context = parseContext({
      home: '/home/me',
      startFolder: '/home/me',
      places: [{ id: 'home', label: 'Home', path: '/home/me' }],
      volumes: [{ label: 'System', path: '/', totalBytes: 10, availableBytes: 5 }],
      settings: {},
    });
    expect(context.canRestoreFromTrash).toBe(false);
    expect(context.undo).toBeNull();
    expect(() => parseContext({ places: [], volumes: [], settings: {} })).toThrow(PayloadError);
  });

  test('string lists', () => {
    expect(parseStrings(['/a'], 'changed')).toEqual(['/a']);
    expect(() => parseStrings([1], 'changed')).toThrow('Unexpected changed');
  });
});
