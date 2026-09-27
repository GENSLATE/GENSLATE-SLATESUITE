import { describe, expect, test } from 'bun:test';

import {
  describeInstall,
  favoriteApps,
  recentApps,
} from '../../../src/features/tray-menu/tray-menu.model';
import { app } from '../fixtures';

const APPS = [
  app('genslate/terminal', { favorite: true }),
  app('genslate/explorer', { favorite: true }),
  app('genslate/editor'),
  app('genslate/jukebox', { favorite: true, hidden: true }),
  app('portableapps/FirefoxPortable', { name: 'Mozilla Firefox' }),
];

describe('recentApps', () => {
  test('resolves ids newest first, drops unknown and hidden apps, and caps the list', () => {
    const list = {
      apps: APPS,
      tabs: [],
      recent: [
        'genslate/editor',
        'genslate/gone',
        'genslate/jukebox',
        'portableapps/FirefoxPortable',
        'genslate/terminal',
        'genslate/explorer',
      ],
    };
    expect(recentApps(list).map((entry) => entry.id)).toEqual([
      'genslate/editor',
      'portableapps/FirefoxPortable',
      'genslate/terminal',
      'genslate/explorer',
    ]);
    expect(recentApps(list, 2)).toHaveLength(2);
  });
});

describe('favoriteApps', () => {
  test('visible favorites sorted by name', () => {
    const list = { apps: APPS, tabs: [], recent: [] };
    expect(favoriteApps(list).map((entry) => entry.name)).toEqual(['Explorer', 'Terminal']);
  });
});

describe('describeInstall', () => {
  test('names where the launcher runs from', () => {
    expect(describeInstall({ mode: 'suite', suiteName: 'GENSLATE-USB' })).toBe(
      'Suite · GENSLATE-USB',
    );
    expect(describeInstall({ mode: 'suite', suiteName: null })).toBe('Portable suite');
    expect(describeInstall({ mode: 'standalone', suiteName: null })).toBe('Standalone');
    expect(describeInstall({ mode: 'dev', suiteName: null })).toBe('Development build');
    expect(describeInstall({ mode: 'web', suiteName: null })).toBe('Browser preview');
  });
});
