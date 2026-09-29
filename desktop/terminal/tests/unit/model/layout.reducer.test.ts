import { describe, expect, test } from 'bun:test';

import {
  activeTab,
  allPanes,
  EMPTY_LAYOUT,
  type LayoutAction,
  type LayoutState,
  layoutReducer,
} from '../../../src/model/layout.reducer';
import type { PaneLeaf } from '../../../src/model/pane-tree.util';

const pane = (id: string): PaneLeaf => ({ type: 'pane', id, profileId: 'pwsh', cwd: null });

function run(...actions: readonly LayoutAction[]): LayoutState {
  return actions.reduce(layoutReducer, EMPTY_LAYOUT);
}

const threeTabs = (): LayoutState =>
  run(
    { type: 'new-tab', id: 't1', pane: pane('p1') },
    { type: 'new-tab', id: 't2', pane: pane('p2') },
    { type: 'new-tab', id: 't3', pane: pane('p3') },
  );

describe('layout reducer', () => {
  test('new tabs open at the end, or right after a given tab, and become active', () => {
    const state = layoutReducer(threeTabs(), {
      type: 'new-tab',
      id: 't4',
      pane: pane('p4'),
      after: 't1',
    });
    expect(state.tabs.map((tab) => tab.id)).toEqual(['t1', 't4', 't2', 't3']);
    expect(state.activeTabId).toBe('t4');
  });

  test('closing the active tab activates its right neighbour, else the left one', () => {
    let state = layoutReducer(threeTabs(), { type: 'activate-tab', id: 't2' });
    state = layoutReducer(state, { type: 'close-tab', id: 't2' });
    expect(state.activeTabId).toBe('t3');
    state = layoutReducer(state, { type: 'close-tab', id: 't3' });
    expect(state.activeTabId).toBe('t1');
    state = layoutReducer(state, { type: 'close-tab', id: 't1' });
    expect(state).toEqual(EMPTY_LAYOUT);
  });

  test('cycling wraps around both ways', () => {
    let state = threeTabs();
    state = layoutReducer(state, { type: 'cycle-tab', delta: 1 });
    expect(state.activeTabId).toBe('t1');
    state = layoutReducer(state, { type: 'cycle-tab', delta: -1 });
    expect(state.activeTabId).toBe('t3');
  });

  test('moving a tab keeps the others in order', () => {
    const state = layoutReducer(threeTabs(), { type: 'move-tab', id: 't3', to: 0 });
    expect(state.tabs.map((tab) => tab.id)).toEqual(['t3', 't1', 't2']);
  });

  test('renaming trims, and a blank name follows the shell again', () => {
    let state = layoutReducer(threeTabs(), { type: 'rename-tab', id: 't1', title: '  api  ' });
    expect(state.tabs[0]?.title).toBe('api');
    state = layoutReducer(state, { type: 'rename-tab', id: 't1', title: '   ' });
    expect(state.tabs[0]?.title).toBeNull();
  });

  test('splits focus the new pane; closing the last pane closes the tab', () => {
    let state = run(
      { type: 'new-tab', id: 't1', pane: pane('p1') },
      { type: 'split', paneId: 'p1', direction: 'row', pane: pane('p2'), splitId: 's1' },
    );
    expect(activeTab(state)?.activePaneId).toBe('p2');
    expect(allPanes(state).map((leaf) => leaf.id)).toEqual(['p1', 'p2']);

    state = layoutReducer(state, { type: 'close-pane', paneId: 'p2' });
    expect(activeTab(state)?.activePaneId).toBe('p1');
    state = layoutReducer(state, { type: 'close-pane', paneId: 'p1' });
    expect(state.tabs).toHaveLength(0);
  });

  test('zoom needs a split, and a new split un-zooms', () => {
    let state = run({ type: 'new-tab', id: 't1', pane: pane('p1') }, { type: 'toggle-zoom' });
    expect(activeTab(state)?.zoomedPaneId).toBeNull();
    state = run(
      { type: 'new-tab', id: 't1', pane: pane('p1') },
      { type: 'split', paneId: 'p1', direction: 'column', pane: pane('p2'), splitId: 's1' },
      { type: 'toggle-zoom' },
    );
    expect(activeTab(state)?.zoomedPaneId).toBe('p2');
    state = layoutReducer(state, {
      type: 'split',
      paneId: 'p2',
      direction: 'row',
      pane: pane('p3'),
      splitId: 's2',
    });
    expect(activeTab(state)?.zoomedPaneId).toBeNull();
  });

  test('focusing a pane in another tab switches to that tab', () => {
    const state = layoutReducer(threeTabs(), { type: 'focus-pane', paneId: 'p1' });
    expect(state.activeTabId).toBe('t1');
  });

  test('focus by direction moves between neighbours', () => {
    const state = run(
      { type: 'new-tab', id: 't1', pane: pane('p1') },
      { type: 'split', paneId: 'p1', direction: 'row', pane: pane('p2'), splitId: 's1' },
      { type: 'focus-direction', direction: 'left' },
    );
    expect(activeTab(state)?.activePaneId).toBe('p1');
  });

  test('actions that change nothing return the same state', () => {
    const state = threeTabs();
    expect(layoutReducer(state, { type: 'activate-tab', id: 't3' })).toBe(state);
    expect(layoutReducer(state, { type: 'close-tab', id: 'nope' })).toBe(state);
    expect(layoutReducer(state, { type: 'move-tab', id: 't1', to: 0 })).toBe(state);
  });
});
