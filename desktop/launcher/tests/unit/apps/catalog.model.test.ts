import { describe, expect, test } from 'bun:test';

import { flatten, groupApps, searchApps, sourceOf } from '../../../src/features/apps/catalog.model';
import { app } from '../fixtures';

const APPS = [
  app('genslate/explorer', { category: 'System', favorite: true }),
  app('genslate/terminal', { category: 'Development' }),
  app('genslate/coder', { category: 'Development' }),
  app('genslate/jukebox', { category: 'Media', hidden: true }),
  app('genslate/aistudio', { category: 'AI', status: 'not-installed' }),
  app('portableapps/FirefoxPortable', { name: 'Mozilla Firefox', category: 'Internet' }),
];

describe('groupApps', () => {
  test('favorites, recent, ordered categories, then not-installed', () => {
    const groups = groupApps(APPS, 'genslate', ['genslate/explorer', 'genslate/coder']);
    expect(groups.map((group) => group.id)).toEqual([
      'favorites',
      'recent',
      'category:System',
      'category:Development',
      'unavailable',
    ]);
    expect(groups[1]?.apps.map((a) => a.id)).toEqual(['genslate/coder']);
    expect(groups[3]?.apps.map((a) => a.name)).toEqual(['Coder', 'Terminal']);
  });

  test('keeps sources apart and hides hidden apps', () => {
    const groups = groupApps(APPS, 'portableapps', []);
    expect(groups.flatMap((g) => g.apps).map((a) => a.id)).toEqual([
      'portableapps/FirefoxPortable',
    ]);
    expect(
      groupApps(APPS, 'genslate', [])
        .flatMap((g) => g.apps)
        .some((a) => a.hidden),
    ).toBe(false);
  });

  test('flatten skips collapsed groups', () => {
    const groups = groupApps(APPS, 'genslate', []);
    const order = flatten(groups, new Set(['category:System', 'unavailable']));
    expect(order.map((a) => a.id)).toEqual([
      'genslate/explorer',
      'genslate/coder',
      'genslate/terminal',
    ]);
  });
});

describe('searchApps', () => {
  test('searches every source; names first, installed before not-installed', () => {
    expect(searchApps(APPS, 'fire').map((a) => a.id)).toEqual(['portableapps/FirefoxPortable']);
    const hits = searchApps(
      [...APPS, app('genslate/terminal2', { name: 'Termite', status: 'not-installed' })],
      'ter',
    );
    expect(hits[0]?.id).toBe('genslate/terminal');
  });

  test('matches categories and ignores hidden apps', () => {
    expect(
      searchApps(APPS, 'develop')
        .map((a) => a.id)
        .sort(),
    ).toEqual(['genslate/coder', 'genslate/terminal']);
    expect(searchApps(APPS, 'jukebox')).toEqual([]);
    expect(searchApps(APPS, '   ')).toEqual([]);
  });

  test('sourceOf reads the id prefix', () => {
    expect(sourceOf('portapps/x-portable')).toBe('portapps');
    expect(sourceOf('genslate/explorer')).toBe('genslate');
  });
});

describe('search strictness', () => {
  test('short queries need a contiguous match; longer ones may be fuzzy', () => {
    const apps = [app('genslate/example'), app('portableapps/KeePassXC', { name: 'KeePassXC' })];
    expect(searchApps(apps, 'ex').map((a) => a.id)).toEqual(['genslate/example']);
    expect(searchApps(apps, 'kpx').map((a) => a.id)).toEqual(['portableapps/KeePassXC']);
  });
});
