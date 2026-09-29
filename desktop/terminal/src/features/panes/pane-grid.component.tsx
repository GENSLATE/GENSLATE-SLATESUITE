import { cn } from '@genslate/design-system';

import { useTerminal } from '../../app/terminal.context';
import type { TabState } from '../../model/layout.reducer';
import { layoutRects, leaves, type Rect, splitHandles } from '../../model/pane-tree.util';
import { EmptyTerminal } from './empty-terminal.component';
import { PaneView } from './pane-view.component';
import { SplitDivider } from './split-divider.component';

const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };

/**
 * Every tab's panes, stacked: only the active tab shows, the others stay mounted (hidden) so
 * their shells keep running and their output keeps arriving. Panes are placed absolutely from
 * the split tree, so splitting or closing never remounts a terminal.
 */
export function PaneGrid() {
  const api = useTerminal();
  const { tabs, activeTabId } = api.layout;

  if (tabs.length === 0) return <EmptyTerminal />;

  return (
    <div data-slot="pane-grid" className="relative min-h-0 flex-1 bg-terminal-bg">
      {tabs.map((tab) => (
        <TabPanes key={tab.id} tab={tab} visible={tab.id === activeTabId} />
      ))}
    </div>
  );
}

function TabPanes({ tab, visible }: { readonly tab: TabState; readonly visible: boolean }) {
  const rects = layoutRects(tab.root);
  const zoomed = tab.zoomedPaneId;
  const split = leaves(tab.root).length > 1;

  return (
    <section
      aria-label="Terminal panes"
      aria-hidden={!visible}
      data-pane-visible={visible}
      className={cn('absolute inset-0', !visible && 'pointer-events-none invisible')}
    >
      {leaves(tab.root).map((leaf) => {
        const hidden = zoomed !== null && zoomed !== leaf.id;
        return (
          <PaneView
            key={leaf.id}
            paneId={leaf.id}
            tab={tab}
            rect={zoomed === leaf.id ? FULL : (rects.get(leaf.id) ?? FULL)}
            hidden={hidden}
            split={split && zoomed === null}
            visible={visible && !hidden}
          />
        );
      })}
      {zoomed === null
        ? splitHandles(tab.root).map((handle) => (
            <SplitDivider key={handle.id} tabId={tab.id} handle={handle} />
          ))
        : null}
    </section>
  );
}
