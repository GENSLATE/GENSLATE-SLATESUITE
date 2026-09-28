import { cn, Icon, IconButton } from '@genslate/design-system';
import type { KeyboardEvent } from 'react';

import { useExplorer } from '../../app/explorer.context';
import { baseName } from '../../model/path.util';
import type { Tab } from '../../model/tabs.reducer';
import { useDropTarget } from '../files/drag-drop.hook';

/** Browser-style tabs, one folder each: drop items on a tab to move them into its folder. */
export function TabStrip() {
  const api = useExplorer();
  const { tabs } = api;
  const index = tabs.tabs.findIndex((tab) => tab.id === tabs.activeId);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = tabs.tabs[(index + delta + tabs.tabs.length) % tabs.tabs.length];
    if (next === undefined) return;
    api.dispatch({ type: 'activate', id: next.id });
    document.getElementById(`explorer-tab-${next.id}`)?.focus();
  };

  return (
    <div
      data-slot="tab-strip"
      className="hairline-b flex h-tabbar shrink-0 items-end gap-1 bg-tab-strip-bg px-1.5"
    >
      <div
        role="tablist"
        aria-label="Folder tabs"
        onKeyDown={onKeyDown}
        className="scrollbar-none flex min-w-0 items-end gap-0.5 overflow-x-auto"
      >
        {tabs.tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={tab.id === tabs.activeId}
            closable={tabs.tabs.length > 1}
          />
        ))}
      </div>
      <IconButton
        size="sm"
        icon="codicon:add"
        label="New tab"
        tooltipShortcut="mod+t"
        className="mb-1 shrink-0"
        onClick={() => api.newTab(api.tab.path)}
      />
    </div>
  );
}

function tabTitle(tab: Tab): string {
  return tab.search === null ? baseName(tab.path) : `Search: ${tab.search.text}`;
}

function TabButton({
  tab,
  active,
  closable,
}: {
  readonly tab: Tab;
  readonly active: boolean;
  readonly closable: boolean;
}) {
  const api = useExplorer();
  const drop = useDropTarget(tab.path);
  const close = () => api.dispatch({ type: 'close-tab', id: tab.id });
  const title = tabTitle(tab);

  return (
    <div
      role="tab"
      id={`explorer-tab-${tab.id}`}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      title={tab.path}
      data-context-zone="tab"
      data-tab-id={tab.id}
      onMouseDown={(event) => {
        if (event.button === 0) api.dispatch({ type: 'activate', id: tab.id });
      }}
      onAuxClick={(event) => {
        if (event.button === 1 && closable) close();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Delete' || !closable) return;
        // Handled here: the global Delete (Move to Trash) must not fire.
        event.preventDefault();
        close();
      }}
      {...drop.handlers}
      className={cn(
        'group/tab relative flex h-8 w-44 min-w-24 shrink cursor-interactive select-none items-center gap-1.5 rounded-t-md pr-1 pl-2.5 text-sm',
        'focus-ring-inset transition-colors duration-fast ease-standard',
        active
          ? 'bg-tab-active-bg text-fg-strong'
          : 'text-fg-muted hover:bg-fill-hover hover:text-fg',
        drop.over && 'bg-accent-subtle text-fg-strong',
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-tab-indicator window-inactive:bg-fg-disabled"
        />
      ) : null}
      <Icon
        name={tab.search === null ? 'codicon:folder' : 'codicon:search'}
        size={14}
        className={active ? 'text-accent-fg' : 'text-fg-muted'}
      />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {closable ? (
        <IconButton
          size="xs"
          icon="codicon:close"
          label={`Close ${title}`}
          tooltip={false}
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={close}
          className={cn('shrink-0', !active && 'opacity-0 group-hover/tab:opacity-100')}
        />
      ) : null}
    </div>
  );
}
