import { Button, cn, Icon } from '@genslate/design-system';

import { useTerminal } from '../../app/terminal.context';
import type { PaneState } from '../../engine/pane-store';

/** Shown when a pane's shell ended or couldn't start: restart it, or close the pane. */
export function ExitedBanner({
  paneId,
  state,
}: {
  readonly paneId: string;
  readonly state: PaneState;
}) {
  const api = useTerminal();
  const failed = state.status === 'failed';
  const clean = !failed && (state.exitCode === 0 || state.exitCode === null);
  const message = failed
    ? `${state.shellName} couldn’t start`
    : state.exitCode === null
      ? `${state.shellName} ended`
      : `${state.shellName} ended with code ${state.exitCode}`;

  return (
    <div
      role="status"
      className="absolute inset-x-4 bottom-4 z-raised flex items-center gap-3 rounded-card bg-surface-raised py-2 pr-2 pl-3 shadow-popover ring-1 ring-border-subtle"
    >
      <Icon
        name={failed ? 'codicon:error' : clean ? 'codicon:pass' : 'codicon:warning'}
        className={cn(
          'shrink-0',
          failed ? 'text-danger-fg' : clean ? 'text-success-fg' : 'text-warning-fg',
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate font-medium text-fg-strong text-sm">{message}</p>
        {state.error === null ? null : (
          <p className="truncate text-fg-muted text-xs" title={state.error}>
            {state.error}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="primary"
        leadingIcon="codicon:debug-restart"
        onClick={() => api.restartPane(paneId)}
      >
        Restart
      </Button>
      <Button size="sm" variant="ghost" onClick={() => api.closePane(paneId, true)}>
        Close
      </Button>
    </div>
  );
}
