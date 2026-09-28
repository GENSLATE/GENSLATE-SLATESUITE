import { describe, expect, test } from 'bun:test';

import type { Entry } from '../../../src/ipc/explorer.types';
import { formatBytes, formatDate, kindLabel, plural } from '../../../src/model/format.util';
import { filterEntries, sortEntries } from '../../../src/model/sort.util';

function entry(name: string, extra: Partial<Entry> = {}): Entry {
  return {
    name,
    path: `/x/${name}`,
    isDir: false,
    kind: 'other',
    extension: null,
    size: 0,
    modified: 0,
    created: 0,
    hidden: false,
    readonly: false,
    symlink: false,
    ...extra,
  };
}

describe('formatting', () => {
  test('sizes use 1024-byte units', () => {
    expect(formatBytes(0)).toBe('0 bytes');
    expect(formatBytes(1)).toBe('1 byte');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024 * 150)).toBe('150 MB');
  });

  test('counts', () => {
    expect(plural(1, 'item')).toBe('1 item');
    expect(plural(3, 'match', 'matches')).toBe('3 matches');
  });

  test('dates say Today and Yesterday', () => {
    const now = new Date(2026, 8, 28, 15, 0).getTime();
    expect(formatDate(new Date(2026, 8, 28, 9, 5).getTime(), now)).toStartWith('Today, ');
    expect(formatDate(new Date(2026, 8, 27, 9, 5).getTime(), now)).toStartWith('Yesterday, ');
    expect(formatDate(null, now)).toBe('—');
  });

  test('kind labels', () => {
    expect(kindLabel({ kind: 'image', extension: 'png' })).toBe('PNG image');
    expect(kindLabel({ kind: 'other', extension: 'xyz' })).toBe('XYZ file');
    expect(kindLabel({ kind: 'folder', extension: null })).toBe('Folder');
  });
});

describe('sorting', () => {
  const entries = [
    entry('file10.txt', { size: 5 }),
    entry('File2.txt', { size: 50 }),
    entry('b', { isDir: true, kind: 'folder' }),
    entry('a.txt', { size: 500, modified: 10 }),
  ];

  test('natural name order with folders first', () => {
    const sorted = sortEntries(entries, { by: 'name', descending: false, foldersFirst: true });
    expect(sorted.map((item) => item.name)).toEqual(['b', 'a.txt', 'File2.txt', 'file10.txt']);
  });

  test('descending size keeps folders first', () => {
    const sorted = sortEntries(entries, { by: 'size', descending: true, foldersFirst: true });
    expect(sorted.map((item) => item.name)).toEqual(['b', 'a.txt', 'File2.txt', 'file10.txt']);
  });

  test('folders mixed in when foldersFirst is off', () => {
    const sorted = sortEntries(entries, { by: 'name', descending: false, foldersFirst: false });
    expect(sorted.map((item) => item.name)).toEqual(['a.txt', 'b', 'File2.txt', 'file10.txt']);
  });

  test('filter is a case-insensitive substring match', () => {
    expect(filterEntries(entries, 'FILE').map((item) => item.name)).toEqual([
      'file10.txt',
      'File2.txt',
    ]);
    expect(filterEntries(entries, '  ')).toBe(entries);
  });
});
