import {
  cn,
  Icon,
  IconButton,
  SidebarContent,
  SidebarHeader,
  SidebarSection,
  Spinner,
} from '@genslate/design-system';
import { useEffect, useState } from 'react';

import { useTerminal } from '../../app/terminal.context';
import { type PaneState, usePaneStates } from '../../engine/pane-store';
import type { SessionInfo } from '../../ipc/terminal.types';
import { formatBytes, formatDuration, plural } from '../../model/format.util';
import { allPanes, type TabState } from '../../model/layout.reducer';
import { leaves } from '../../model/pane-tree.util';
import { tildify } from '../../model/path.util';
import { colorText, profileIcon } from '../tabs/profile-visual.util';
import { tabColor, tabTitle } from '../tabs/tab-title.util';

const POLL_MS = 2_000;

/**
 * The Sessions tab: every shell in every tab, live: where it is, what it runs (with the
 * program's CPU and memory), how its last command went. Click one to jump to it.
 */
export function SessionsPanel() {
  const api = useTerminal();
  const states = usePaneStates(api.store);
  const ids = allPanes(api.layout).map((pane) => pane.id);
  const idsKey = ids.join(',');
  const [infos, setInfos] = useState<ReadonlyMap<string, SessionInfo>>(new Map());

  useEffect(() => {
    const paneIds = idsKey === '' ? [] : idsKey.split(',');
    let active = true;
    const poll = () => {
      api.backend.sessions(paneIds).then(
        (list) => {
          if (active) setInfos(new Map(list.map((info) => [info.id, info])));
        },
        (error: unknown) => console.warn('terminal: session info unavailable', error),
      );
    };
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api.backend, idsKey]);

  const running = ids.filter((id) => states.get(id)?.busy === true).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SidebarHeader
        title="Sessions"
        actions={
          <IconButton size="xs" icon="codicon:add" label="New tab" onClick={() => api.newTab()} />
        }
      />
      <p className="px-4 pb-1.5 text-fg-muted text-xs">
        {plural(ids.length, 'shell')}
        {running > 0 ? ` · ${running} running a command` : ''}
      </p>
      <SidebarContent aria-label="Sessions">
        {api.layout.tabs.map((tab, index) => (
          <TabGroup key={tab.id} tab={tab} index={index} states={states} infos={infos} />
        ))}
      </SidebarContent>
    </div>
  );
}

function TabGroup({
  tab,
  index,
  states,
  infos,
}: {
  readonly tab: TabState;
  readonly index: number;
  readonly states: ReadonlyMap<string, PaneState>;
  readonly infos: ReadonlyMap<string, SessionInfo>;
}) {
  const api = useTerminal();
  const panes = leaves(tab.root);
  const focused = states.get(tab.activePaneId);
  const profile = api.profile(focused?.profileId ?? api.defaultProfileId);

  return (
    <SidebarSection
      title={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-fg-disabled tabular-nums">{index + 1}</span>
          <span className="truncate">{tabTitle(tab, focused, profile)}</span>
        </span>
      }
      actions={
        <IconButton
          size="xs"
          icon="codicon:close"
          label="Close tab"
          onClick={() => api.closeTab(tab.id)}
        />
      }
    >
      <ul className="flex flex-col gap-0.5 px-2">
        {panes.map((leaf) => (
          <li key={leaf.id}>
            <SessionRow
              paneId={leaf.id}
              tab={tab}
              state={states.get(leaf.id)}
              info={infos.get(leaf.id)}
            />
          </li>
        ))}
      </ul>
    </SidebarSection>
  );
}

function SessionRow({
  paneId,
  tab,
  state,
  info,
}: {
  readonly paneId: string;
  readonly tab: TabState;
  readonly state: PaneState | undefined;
  readonly info: SessionInfo | undefined;
}) {
  const api = useTerminal();
  if (state === undefined) return null;
  const profile = api.profile(state.profileId);
  const current = api.layout.activeTabId === tab.id && tab.activePaneId === paneId;
  const last = state.lastCommand;
  const failed = last !== null && last.exitCode !== null && last.exitCode !== 0;

  return (
    <button
      type="button"
      aria-current={current ? 'true' : undefined}
      data-context-zone="session"
      data-pane-id={paneId}
      onClick={() => {
        api.dispatch({ type: 'activate-tab', id: tab.id });
        api.focusPane(paneId);
      }}
      className={cn(
        'group/row flex w-full cursor-interactive flex-col gap-1 rounded-control px-2 py-1.5 text-left',
        'focus-ring-inset transition-colors duration-fast ease-standard hover:bg-fill-hover active:bg-fill-pressed',
        'aria-[current]:bg-selection window-inactive:aria-[current]:bg-selection-inactive',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon
          name={profileIcon(profile.icon)}
          size={14}
          className={cn('shrink-0', colorText(tabColor(tab, profile)))}
        />
        <span className="min-w-0 flex-1 truncate text-fg-strong text-sm">{state.shellName}</span>
        <StatusMark state={state} />
      </span>
      <span className="truncate pl-5.5 font-mono text-2xs text-fg-muted">
        {state.cwd === null ? '—' : tildify(state.cwd, api.context.home)}
      </span>
      {state.busy ? (
        <span className="flex min-w-0 items-center gap-1.5 pl-5.5 text-xs">
          <span className="truncate font-mono text-accent-fg">
            {state.currentCommand ?? info?.running?.name ?? 'Running'}
          </span>
          {info?.running == null ? null : (
            <span className="ml-auto shrink-0 text-fg-muted tabular-nums">
              {Math.round(info.running.cpu)}% · {formatBytes(info.running.memoryBytes)}
            </span>
          )}
        </span>
      ) : last === null ? null : (
        <span className="flex min-w-0 items-center gap-1.5 pl-5.5 text-xs">
          <Icon
            name={failed ? 'codicon:error' : 'codicon:pass'}
            size={12}
            className={cn('shrink-0', failed ? 'text-danger-fg' : 'text-success-fg')}
          />
          <span className="min-w-0 truncate font-mono text-fg-secondary">{last.command}</span>
          <span className="ml-auto shrink-0 text-fg-muted tabular-nums">
            {formatDuration(last.durationMs)}
          </span>
        </span>
      )}
    </button>
  );
}

function StatusMark({ state }: { readonly state: PaneState }) {
  if (state.status === 'starting') return <Spinner size={12} label="Starting" />;
  if (state.status === 'failed') {
    return <Icon name="codicon:error" size={12} className="text-danger-fg" aria-label="Failed" />;
  }
  if (state.status === 'exited') {
    return <span className="text-2xs text-fg-muted">exited</span>;
  }
  if (state.busy) return <Spinner size={12} label="Running a command" />;
  return (
    <span className="text-2xs text-fg-muted tabular-nums">
      {state.cols}×{state.rows}
    </span>
  );
}
