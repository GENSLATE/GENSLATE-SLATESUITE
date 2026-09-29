import { Badge, cn, IconButton, usePlatform } from '@genslate/design-system';
import { useEffect, useEffectEvent, useRef } from 'react';

import { command, shortcutFor } from '../../app/commands.registry';
import { useTerminal } from '../../app/terminal.context';
import { usePaneState } from '../../engine/pane-store';
import type { TabState } from '../../model/layout.reducer';
import type { Rect } from '../../model/pane-tree.util';
import { CommandBar } from './command-bar.component';
import { ExitedBanner } from './exited-banner.component';
import { FindBar } from './find-bar.component';
import { PaneMenu } from './pane-menu.component';

const percent = (value: number) => `${value * 100}%`;

interface PaneViewProps {
  readonly paneId: string;
  readonly tab: TabState;
  readonly rect: Rect;
  /** Hidden behind a maximized sibling. */
  readonly hidden: boolean;
  /** The tab has other panes on screen (draw the focus ring). */
  readonly split: boolean;
  /** On screen now (active tab, not hidden). */
  readonly visible: boolean;
}

/**
 * One terminal: the session's xterm mounts into this box (and stays alive when it unmounts),
 * with its find bar, the `#` command bar, the exit banner and the bell on top.
 */
export function PaneView({ paneId, tab, rect, hidden, split, visible }: PaneViewProps) {
  const api = useTerminal();
  const platform = usePlatform();
  const state = usePaneState(api.store, paneId);
  const hostRef = useRef<HTMLDivElement>(null);
  const active = tab.activePaneId === paneId;
  const zoomed = tab.zoomedPaneId === paneId;

  const attach = useEffectEvent((element: HTMLElement) => api.attachPane(paneId, element));
  const detach = useEffectEvent((element: HTMLElement) => api.detachPane(paneId, element));
  useEffect(() => {
    const element = hostRef.current;
    if (element === null) return;
    attach(element);
    return () => detach(element);
  }, []);

  // Output that arrived out of sight has been seen once the pane shows.
  const activity = state?.activity === true;
  useEffect(() => {
    if (visible && activity) api.store.update(paneId, { activity: false });
  }, [visible, activity, api.store, paneId]);

  const exited = state?.status === 'exited' || state?.status === 'failed';

  return (
    <div
      data-slot="pane"
      data-pane-id={paneId}
      data-pane-visible={visible}
      data-active={active ? '' : undefined}
      aria-hidden={hidden || undefined}
      style={{
        left: percent(rect.x),
        top: percent(rect.y),
        width: percent(rect.w),
        height: percent(rect.h),
      }}
      className={cn('absolute flex flex-col', hidden && 'pointer-events-none invisible')}
    >
      <PaneMenu paneId={paneId}>
        <div ref={hostRef} data-slot="pane-host" className="relative min-h-0 flex-1" />
      </PaneMenu>

      {/* The focused pane of a split wears the accent; broadcasting panes wear a warning. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0',
          tab.broadcast
            ? 'ring-1 ring-warning ring-inset'
            : split && active
              ? 'ring-1 ring-accent window-inactive:ring-border ring-inset'
              : '',
        )}
      />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 bg-warning-subtle opacity-0 transition-opacity duration-fast ease-exit motion-reduce:transition-none',
          state?.bell === true && 'opacity-100',
        )}
      />

      {zoomed ? (
        <div className="absolute top-2 right-4 z-raised flex items-center gap-1 rounded-full bg-surface-raised py-0.5 pr-0.5 pl-2 shadow-popover">
          <Badge tone="accent" size="sm" pill icon="codicon:screen-full">
            Maximized
          </Badge>
          <IconButton
            size="xs"
            icon="codicon:screen-normal"
            label="Restore the panes"
            tooltipShortcut={shortcutFor(command('zoom-pane'), platform)}
            onClick={() => api.dispatch({ type: 'toggle-zoom' })}
          />
        </div>
      ) : null}

      {api.findOpen && active && visible ? <FindBar paneId={paneId} /> : null}
      {api.commandBarPane === paneId && visible ? <CommandBar paneId={paneId} /> : null}
      {exited && state !== undefined ? <ExitedBanner paneId={paneId} state={state} /> : null}
    </div>
  );
}
