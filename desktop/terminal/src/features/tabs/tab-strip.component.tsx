import { cn, Icon, IconButton, Spinner } from '@genslate/design-system';
import { type KeyboardEvent, type PointerEvent, useRef } from 'react';

import { useTerminal } from '../../app/terminal.context';
import { usePaneStates } from '../../engine/pane-store';
import type { TabState } from '../../model/layout.reducer';
import { NewTabButton } from './new-tab-button.component';
import { colorFill, colorText, profileIcon } from './profile-visual.util';
import { type TabSignal, tabColor, tabSignal, tabTitle } from './tab-title.util';

/** Pixels the pointer moves before a press on a tab becomes a drag. */
const DRAG_THRESHOLD = 4;

/**
 * The tabs, in the titlebar like Windows Terminal: drag to reorder, middle-click to close,
 * right-click for rename, colour and close. Each tab shows its shell, its title and what is
 * happening out of sight (a running command, new output, a failure, the bell).
 */
export function TabStrip() {
  const api = useTerminal();
  const states = usePaneStates(api.store);
  const { tabs, activeTabId } = api.layout;
  const listRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; x: number; moved: boolean } | null>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === activeTabId);
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0 || index === -1) return;
    event.preventDefault();
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (next === undefined) return;
    api.dispatch({ type: 'activate-tab', id: next.id });
    document.getElementById(`terminal-tab-${next.id}`)?.focus();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    const list = listRef.current;
    if (current === null || list === null) return;
    if (!current.moved && Math.abs(event.clientX - current.x) < DRAG_THRESHOLD) return;
    current.moved = true;
    const rects = [...list.querySelectorAll('[role="tab"]')].map((node) =>
      node.getBoundingClientRect(),
    );
    const to = rects.findIndex((rect) => event.clientX < rect.left + rect.width / 2);
    api.dispatch({ type: 'move-tab', id: current.id, to: to === -1 ? rects.length - 1 : to });
  };

  return (
    <div data-slot="tab-strip" className="flex h-full min-w-0 flex-1 items-center gap-1">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Terminal tabs"
        onKeyDown={onKeyDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        className="scrollbar-none flex h-full min-w-0 items-center gap-1 overflow-x-auto"
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={tab.id === activeTabId}
            signal={tabSignal(tab, states, tab.id === activeTabId)}
            onPressStart={(event) => {
              drag.current = { id: tab.id, x: event.clientX, moved: false };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
          />
        ))}
      </div>
      <NewTabButton />
      {/* The rest of the strip drags the window. */}
      <div data-tauri-drag-region className="h-full min-w-6 flex-1" />
    </div>
  );
}

interface TabButtonProps {
  readonly tab: TabState;
  readonly active: boolean;
  readonly signal: TabSignal;
  readonly onPressStart: (event: PointerEvent<HTMLDivElement>) => void;
}

function TabButton({ tab, active, signal, onPressStart }: TabButtonProps) {
  const api = useTerminal();
  const states = usePaneStates(api.store);
  const pane = states.get(tab.activePaneId);
  const leafProfile = api.profile(pane?.profileId ?? api.defaultProfileId);
  const title = tabTitle(tab, pane, leafProfile);
  const color = tabColor(tab, leafProfile);
  const close = () => api.closeTab(tab.id);

  return (
    <div
      role="tab"
      id={`terminal-tab-${tab.id}`}
      aria-selected={active}
      aria-label={`${title}${signalLabel(signal)}`}
      tabIndex={active ? 0 : -1}
      title={pane?.cwd ?? title}
      data-context-zone="tab"
      data-tab-id={tab.id}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        api.dispatch({ type: 'activate-tab', id: tab.id });
        onPressStart(event);
      }}
      onAuxClick={(event) => {
        if (event.button === 1) close();
      }}
      onDoubleClick={() => api.openDialog({ type: 'rename-tab', tabId: tab.id })}
      onKeyDown={(event) => {
        if (event.key === 'F2') api.openDialog({ type: 'rename-tab', tabId: tab.id });
      }}
      className={cn(
        'group/tab relative flex h-7 w-48 min-w-28 shrink cursor-interactive select-none items-center gap-2 rounded-md pr-1 pl-2.5 text-sm',
        'focus-ring transition-colors duration-fast ease-standard',
        active
          ? 'bg-tab-active-bg text-fg-strong shadow-control ring-1 ring-border-subtle'
          : 'text-titlebar-fg window-inactive:text-titlebar-fg-inactive hover:bg-fill-hover hover:text-fg',
      )}
    >
      {tab.color === null ? null : (
        <span
          aria-hidden
          className={cn('absolute inset-x-3 bottom-0 h-0.5 rounded-full', colorFill(tab.color))}
        />
      )}
      <Icon
        name={profileIcon(leafProfile.icon)}
        size={14}
        className={cn('shrink-0', active || color !== null ? colorText(color) : 'text-fg-muted')}
      />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {tab.broadcast ? (
        <Icon name="codicon:broadcast" size={12} className="shrink-0 text-warning-fg" />
      ) : null}
      <SignalMark signal={signal} />
      <IconButton
        size="xs"
        icon="codicon:close"
        label={`Close ${title}`}
        tooltip={false}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={close}
        className={cn(
          'shrink-0',
          !active && 'opacity-0 focus-visible:opacity-100 group-hover/tab:opacity-100',
        )}
      />
    </div>
  );
}

function signalLabel(signal: TabSignal): string {
  switch (signal) {
    case 'bell':
      return ', bell';
    case 'busy':
      return ', running a command';
    case 'failed':
      return ', a command failed';
    case 'activity':
      return ', new output';
    case 'exited':
      return ', exited';
    case null:
      return '';
  }
}

function SignalMark({ signal }: { readonly signal: TabSignal }) {
  switch (signal) {
    case 'bell':
      return <Icon name="codicon:bell-dot" size={12} className="shrink-0 text-warning-fg" />;
    case 'busy':
      return <Spinner size={12} decorative className="shrink-0 text-accent-fg" />;
    case 'failed':
      return <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-danger" />;
    case 'activity':
      return <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />;
    case 'exited':
      return <Icon name="codicon:debug-disconnect" size={12} className="shrink-0 text-fg-muted" />;
    case null:
      return null;
  }
}
