import {
  cn,
  EmptyState,
  Icon,
  IconButton,
  SearchField,
  SidebarContent,
  SidebarHeader,
  ToggleButton,
} from '@genslate/design-system';
import { useEffect, useState } from 'react';

import { errorMessage } from '../../app/error-message.util';
import { useTerminal } from '../../app/terminal.context';
import { usePaneState } from '../../engine/pane-store';
import type { HistoryEntry } from '../../ipc/terminal.types';
import { formatDuration, relativeTime } from '../../model/format.util';
import { baseName, tildify } from '../../model/path.util';

const LIMIT = 200;
const TYPING_DELAY_MS = 120;

type Rows =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly entries: readonly HistoryEntry[] }
  | { readonly status: 'error'; readonly message: string };

/**
 * The History tab: every command you ran, from the shared database, fuzzy-searched. Filter to
 * this folder or to failures. Click to type one again, or ▶ to run it; right-click to
 * save it as a snippet or forget it.
 */
export function HistoryPanel() {
  const api = useTerminal();
  const pane = usePaneState(api.store, api.activePaneId ?? '');
  const [query, setQuery] = useState('');
  const [hereOnly, setHereOnly] = useState(false);
  const [failedOnly, setFailedOnly] = useState(false);
  const [rows, setRows] = useState<Rows>({ status: 'loading' });
  const cwd = hereOnly ? (pane?.cwd ?? null) : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: historyVersion is the refetch signal (a command finished, history was edited)
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      api.backend.searchHistory({ query, cwd, failedOnly, limit: LIMIT }).then(
        (entries) => {
          if (active) setRows({ status: 'ready', entries });
        },
        (error: unknown) => {
          if (active) setRows({ status: 'error', message: errorMessage(error) });
        },
      );
    }, TYPING_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api.backend, query, cwd, failedOnly, api.historyVersion]);

  const now = Date.now();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SidebarHeader
        title="History"
        actions={
          <IconButton
            size="xs"
            icon="codicon:clear-all"
            label="Clear history…"
            disabled={rows.status !== 'ready' || rows.entries.length === 0}
            onClick={() => api.openDialog({ type: 'clear-history' })}
          />
        }
      />
      <div className="flex items-center gap-1 px-3 pb-2">
        <SearchField
          size="sm"
          aria-label="Search history"
          placeholder="Search history"
          value={query}
          onValueChange={setQuery}
          className="min-w-0 flex-1"
        />
        <ToggleButton
          size="sm"
          icon="codicon:folder"
          label={
            pane?.cwd == null ? 'Only this folder' : `Only in ${baseName(pane.cwd) || pane.cwd}`
          }
          pressed={hereOnly}
          onPressedChange={setHereOnly}
        />
        <ToggleButton
          size="sm"
          icon="codicon:error"
          label="Only failed commands"
          pressed={failedOnly}
          onPressedChange={setFailedOnly}
        />
      </div>
      <SidebarContent aria-label="Command history">
        {!api.context.historyEnabled || !api.settings.history ? (
          <EmptyState
            size="sm"
            icon="codicon:history"
            title="History is off"
            description="Turn on “Keep command history” in Settings to remember what you run."
          />
        ) : rows.status === 'loading' ? (
          <p className="px-4 py-2 text-fg-muted text-sm">Loading…</p>
        ) : rows.status === 'error' ? (
          <EmptyState
            size="sm"
            icon="codicon:warning"
            title="Can’t read the history"
            description={rows.message}
          />
        ) : rows.entries.length === 0 ? (
          <EmptyState
            size="sm"
            icon="codicon:history"
            title={query === '' && !hereOnly && !failedOnly ? 'Nothing yet' : 'No matches'}
            description={
              query === '' && !hereOnly && !failedOnly
                ? 'Commands you run show up here.'
                : 'Try other words or turn off a filter.'
            }
          />
        ) : (
          <ul className="flex flex-col gap-px px-2 pb-2">
            {rows.entries.map((entry) => (
              <li key={entry.id}>
                <HistoryRow entry={entry} now={now} />
              </li>
            ))}
          </ul>
        )}
      </SidebarContent>
    </div>
  );
}

function HistoryRow({ entry, now }: { readonly entry: HistoryEntry; readonly now: number }) {
  const api = useTerminal();
  const failed = entry.exitCode !== null && entry.exitCode !== 0;

  return (
    <div
      data-context-zone="history"
      data-history-id={entry.id}
      className="group/row relative rounded-control transition-colors duration-fast ease-standard hover:bg-fill-hover"
    >
      <button
        type="button"
        title={`${entry.command}\n${entry.cwd ?? ''}`}
        onClick={() => api.sendText(entry.command)}
        className="focus-ring-inset flex w-full min-w-0 cursor-interactive flex-col gap-0.5 rounded-control px-2 py-1 text-left active:bg-fill-pressed"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon
            name={
              failed ? 'codicon:error' : entry.exitCode === null ? 'codicon:circle' : 'codicon:pass'
            }
            size={12}
            className={cn(
              'shrink-0',
              failed
                ? 'text-danger-fg'
                : entry.exitCode === null
                  ? 'text-fg-muted'
                  : 'text-success-fg',
            )}
          />
          <code className="min-w-0 flex-1 truncate font-mono text-fg text-xs">{entry.command}</code>
        </span>
        <span className="flex min-w-0 items-center gap-1.5 pl-4.5 text-2xs text-fg-muted">
          <span className="shrink-0 tabular-nums">{relativeTime(entry.startedAt, now)}</span>
          {entry.durationMs === null ? null : (
            <span className="shrink-0 tabular-nums">· {formatDuration(entry.durationMs)}</span>
          )}
          {failed ? <span className="shrink-0 text-danger-fg">· exit {entry.exitCode}</span> : null}
          {entry.cwd === null ? null : (
            <span className="min-w-0 truncate">· {tildify(entry.cwd, api.context.home)}</span>
          )}
        </span>
      </button>
      <div className="absolute top-0.5 right-1 flex gap-0.5 opacity-0 transition-opacity duration-fast group-focus-within/row:opacity-100 group-hover/row:opacity-100">
        <IconButton
          size="xs"
          icon="codicon:play"
          label="Run again"
          onClick={() => api.sendText(entry.command, { run: true })}
        />
        <IconButton
          size="xs"
          icon="codicon:copy"
          label="Copy"
          onClick={() => api.copyText(entry.command, 'Command')}
        />
      </div>
    </div>
  );
}
