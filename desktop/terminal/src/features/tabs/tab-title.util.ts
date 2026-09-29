import type { PaneState } from '../../engine/pane-store';
import type { Profile, ProfileColor } from '../../ipc/terminal.types';
import type { TabState } from '../../model/layout.reducer';
import { leaves } from '../../model/pane-tree.util';

/** A tab's name: the one the user gave it, else what its focused shell calls itself. */
export function tabTitle(tab: TabState, pane: PaneState | undefined, profile: Profile): string {
  if (tab.title !== null) return tab.title;
  const title = pane?.title.trim() ?? '';
  return title === '' ? profile.name : title;
}

/** The tab's colour: its own, else its focused profile's. */
export function tabColor(tab: TabState, profile: Profile): ProfileColor | null {
  return tab.color ?? profile.color;
}

/** What a tab's badge shows, most important first. */
export type TabSignal = 'bell' | 'failed' | 'busy' | 'activity' | 'exited' | null;

export function tabSignal(
  tab: TabState,
  states: ReadonlyMap<string, PaneState>,
  active: boolean,
): TabSignal {
  const panes = leaves(tab.root).flatMap((leaf) => {
    const state = states.get(leaf.id);
    return state === undefined ? [] : [state];
  });
  if (panes.some((pane) => pane.bell)) return 'bell';
  if (panes.some((pane) => pane.busy)) return 'busy';
  if (
    !active &&
    panes.some(
      (pane) =>
        pane.lastCommand !== null &&
        pane.lastCommand.exitCode !== null &&
        pane.lastCommand.exitCode !== 0 &&
        pane.activity,
    )
  ) {
    return 'failed';
  }
  if (!active && panes.some((pane) => pane.activity)) return 'activity';
  if (panes.length > 0 && panes.every((pane) => pane.status === 'exited')) return 'exited';
  return null;
}
