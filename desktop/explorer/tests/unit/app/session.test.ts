import { beforeEach, describe, expect, test } from 'bun:test';

import {
  loadFavorites,
  loadPreference,
  loadSession,
  saveFavorites,
  savePreference,
  saveSession,
} from '../../../src/app/session.util';

beforeEach(() => localStorage.clear());

describe('session storage', () => {
  test('tabs round-trip and invalid tabs are dropped', () => {
    expect(loadSession()).toBeNull();
    saveSession({
      tabs: [{ path: '/a', view: 'icons', sortBy: 'size', sortDescending: true }],
      active: 4,
    });
    expect(loadSession()).toEqual({
      tabs: [{ path: '/a', view: 'icons', sortBy: 'size', sortDescending: true }],
      active: 0,
    });

    localStorage.setItem(
      'genslate.explorer.session',
      JSON.stringify({ tabs: [{ path: '/b', view: 'gallery', sortBy: 'name' }], active: 0 }),
    );
    expect(loadSession()).toBeNull();
    localStorage.setItem('genslate.explorer.session', '{broken');
    expect(loadSession()).toBeNull();
  });

  test('favorites and preferences', () => {
    expect(loadFavorites()).toBeNull();
    saveFavorites(['/a', '/b']);
    expect(loadFavorites()).toEqual(['/a', '/b']);
    savePreference('side-panel', 'chat');
    expect(loadPreference('side-panel')).toBe('chat');
    expect(loadPreference('missing')).toBeNull();
  });
});
