import { describe, expect, test } from 'bun:test';

import {
  activeTab,
  createTab,
  relocatePath,
  type TabDefaults,
  type TabsState,
  tabsReducer,
} from '../../../src/model/tabs.reducer';

const DEFAULTS: TabDefaults = { view: 'details', sortBy: 'name', sortDescending: false };

function start(path = '/home/me'): TabsState {
  const tab = createTab(path, DEFAULTS, 'one');
  return { tabs: [tab], activeId: tab.id };
}

describe('tabs reducer', () => {
  test('open, back, forward and up keep a history per tab', () => {
    let state = start();
    state = tabsReducer(state, { type: 'open', path: '/home/me/Documents' });
    state = tabsReducer(state, { type: 'open', path: '/home/me/Documents/Invoices' });
    expect(activeTab(state).back).toEqual(['/home/me', '/home/me/Documents']);

    state = tabsReducer(state, { type: 'back' });
    expect(activeTab(state).path).toBe('/home/me/Documents');
    // Going back selects the folder you came from.
    expect(activeTab(state).selection.selected).toEqual(['/home/me/Documents/Invoices']);
    expect(activeTab(state).forward).toEqual(['/home/me/Documents/Invoices']);

    state = tabsReducer(state, { type: 'forward' });
    expect(activeTab(state).path).toBe('/home/me/Documents/Invoices');

    state = tabsReducer(state, { type: 'up' });
    expect(activeTab(state).path).toBe('/home/me/Documents');
    expect(activeTab(state).forward).toEqual([]);
  });

  test('opening a folder clears the filter and the search', () => {
    let state = start();
    state = tabsReducer(state, { type: 'filter', filter: 'inv' });
    state = tabsReducer(state, { type: 'search-start', id: 's1', text: 'x', contents: false });
    state = tabsReducer(state, { type: 'open', path: '/tmp' });
    expect(activeTab(state).filter).toBe('');
    expect(activeTab(state).search).toBeNull();
  });

  test('new, cycle and close tabs', () => {
    let state = start();
    state = tabsReducer(state, { type: 'new-tab', path: '/a', defaults: DEFAULTS });
    state = tabsReducer(state, {
      type: 'new-tab',
      path: '/b',
      defaults: DEFAULTS,
      activate: false,
    });
    expect(state.tabs.map((tab) => tab.path)).toEqual(['/home/me', '/a', '/b']);
    expect(activeTab(state).path).toBe('/a');

    state = tabsReducer(state, { type: 'cycle', delta: 1 });
    expect(activeTab(state).path).toBe('/b');
    state = tabsReducer(state, { type: 'cycle', delta: 1 });
    expect(activeTab(state).path).toBe('/home/me');

    const [, second] = state.tabs;
    state = tabsReducer(state, { type: 'activate', id: second?.id ?? '' });
    state = tabsReducer(state, { type: 'close-tab', id: second?.id ?? '' });
    expect(state.tabs.map((tab) => tab.path)).toEqual(['/home/me', '/b']);
    expect(activeTab(state).path).toBe('/b');

    const only = tabsReducer(start(), { type: 'close-tab', id: 'one' });
    expect(only.tabs).toHaveLength(1);
  });

  test('search results stream in and finish', () => {
    let state = start();
    state = tabsReducer(state, { type: 'search-start', id: 's1', text: 'notes', contents: false });
    const entry = {
      name: 'notes.md',
      path: '/home/me/notes.md',
      isDir: false,
      kind: 'markdown',
      extension: 'md',
      size: 1,
      modified: 0,
      created: 0,
      hidden: false,
      readonly: false,
      symlink: false,
    } as const;
    state = tabsReducer(state, { type: 'search-results', id: 's1', entries: [entry] });
    state = tabsReducer(state, { type: 'search-results', id: 'stale', entries: [entry] });
    state = tabsReducer(state, {
      type: 'search-done',
      id: 's1',
      summary: { scanned: 10, matched: 1, truncated: false, cancelled: false },
      error: null,
    });
    expect(activeTab(state).search?.results).toHaveLength(1);
    expect(activeTab(state).search?.status).toBe('done');
  });

  test('tabs inside a renamed folder follow it', () => {
    let state = start('/home/me/Old/sub');
    state = tabsReducer(state, { type: 'relocate', from: '/home/me/Old', to: '/home/me/New' });
    expect(activeTab(state).path).toBe('/home/me/New/sub');
    expect(relocatePath('/home/me/Older', '/home/me/Old', '/x')).toBe('/home/me/Older');
    expect(relocatePath('C:\\A\\B', 'C:\\A', 'C:\\Z')).toBe('C:\\Z\\B');
  });
});
