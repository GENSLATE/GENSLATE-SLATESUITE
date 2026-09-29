import {
  Spinner,
  StatusBar,
  StatusBarItem,
  StatusBarSection,
  useTheme,
} from '@genslate/design-system';
import type { AppInfo } from '@genslate/tauri-bridge';
import { useEffect, useState } from 'react';

import { APP } from '../../app/app.meta';
import { useTerminal } from '../../app/terminal.context';
import { usePaneState } from '../../engine/pane-store';
import type { GitInfo } from '../../ipc/terminal.types';
import { formatDuration } from '../../model/format.util';
import { anyInside, tildify } from '../../model/path.util';
import { profileIcon } from '../tabs/profile-visual.util';

const THEME_NAME = { 'polar-night': 'Polar Night', 'snow-storm': 'Snow Storm' } as const;

interface AppStatusBarProps {
  /** Build metadata from the running binary; `null` in a browser. */
  readonly info: AppInfo | null;
}

/**
 * The active pane at a glance: shell, folder, git branch, the running or last command ·
 * size, broadcast, theme and version.
 */
export function AppStatusBar({ info }: AppStatusBarProps) {
  const api = useTerminal();
  const { resolvedTheme } = useTheme();
  const pane = usePaneState(api.store, api.activePaneId ?? '');
  const cwd = pane?.cwd ?? null;
  const git = useGitInfo(cwd);
  const profile = pane === undefined ? null : api.profile(pane.profileId);
  const last = pane?.lastCommand ?? null;
  const failed = last !== null && last.exitCode !== null && last.exitCode !== 0;

  return (
    <StatusBar>
      <StatusBarSection>
        <StatusBarItem
          accent
          icon={profile === null ? 'codicon:terminal' : profileIcon(profile.icon)}
          label={`${APP.productName}: new tab`}
          onClick={() => api.newTab()}
        >
          {pane?.shellName ?? APP.name}
        </StatusBarItem>
        {cwd === null ? null : (
          <StatusBarItem
            icon="codicon:folder"
            label={`${cwd} (click to show it in the Files panel)`}
            data-context-copy={cwd}
            onClick={() => {
              api.setSidePanel('files');
              api.setSidebarOpen(true);
            }}
          >
            {tildify(cwd, api.context.home)}
          </StatusBarItem>
        )}
        {git === null ? null : (
          <StatusBarItem
            icon="codicon:git-branch-compact"
            label={`Git: ${git.branch ?? `detached at ${git.head}`}, ${git.changes} changed`}
          >
            {git.branch ?? git.head}
            {git.changes > 0 ? ` · ${git.changes}` : ''}
          </StatusBarItem>
        )}
        {pane?.busy === true ? (
          <StatusBarItem
            icon={<Spinner size={12} decorative />}
            label="Running a command"
            data-context-copy={pane.currentCommand ?? undefined}
          >
            {pane.currentCommand ?? 'Running'}
          </StatusBarItem>
        ) : last === null ? null : (
          <StatusBarItem
            icon={failed ? 'codicon:error' : 'codicon:pass'}
            label={
              failed
                ? `The last command failed with code ${last.exitCode}. Click to ask the assistant.`
                : 'The last command succeeded'
            }
            data-context-copy={last.command}
            onClick={
              failed && api.activePaneId !== null
                ? () => api.askAssistant({ paneId: api.activePaneId ?? '', command: last })
                : undefined
            }
          >
            {failed ? `Exit ${last.exitCode}` : 'OK'} · {formatDuration(last.durationMs)}
          </StatusBarItem>
        )}
      </StatusBarSection>
      <StatusBarSection align="end">
        {api.tab?.broadcast === true ? (
          <StatusBarItem
            icon="codicon:broadcast"
            label="Typing goes to every pane in this tab. Click to stop."
            onClick={() => {
              if (api.tab !== null) api.dispatch({ type: 'toggle-broadcast', tabId: api.tab.id });
            }}
          >
            Broadcast
          </StatusBarItem>
        ) : null}
        {pane === undefined || pane.cols === 0 ? null : (
          <StatusBarItem icon="codicon:screen-full" label="Columns × rows">
            {pane.cols}×{pane.rows}
          </StatusBarItem>
        )}
        <StatusBarItem
          icon={pane?.integrated === true ? 'codicon:check-all' : 'codicon:circle-slash'}
          label={
            pane?.integrated === true
              ? 'Shell integration: command marks, folder tracking and history are on'
              : 'This shell doesn’t report commands (no marks or history)'
          }
        >
          {pane?.integrated === true ? 'Integrated' : 'Plain'}
        </StatusBarItem>
        <StatusBarItem icon="codicon:color-mode" label="Switch theme" onClick={api.toggleTheme}>
          {THEME_NAME[resolvedTheme]}
        </StatusBarItem>
        <StatusBarItem
          icon="codicon:tag"
          label={info ? `${info.name} ${info.version} (${info.os} ${info.arch})` : 'App version'}
        >
          v{info?.version ?? APP.version}
          {info?.debug ? ' · debug' : ''}
        </StatusBarItem>
      </StatusBarSection>
    </StatusBar>
  );
}

/** The git repository `cwd` is in (refreshed when the folder or its files change). */
function useGitInfo(cwd: string | null): GitInfo | null {
  const api = useTerminal();
  const [git, setGit] = useState<GitInfo | null>(null);
  // Files change constantly during builds: ask git again only for changes in the repository
  // (or the folder, before there is one).
  const changed = api.changedFolders;
  const [seen, setSeen] = useState(changed);
  const [version, setVersion] = useState(0);
  if (seen !== changed) {
    setSeen(changed);
    const scope = git?.root ?? cwd;
    if (scope !== null && anyInside(changed.folders, scope)) setVersion(version + 1);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: version is the refetch signal (the repository changed on disk)
  useEffect(() => {
    if (cwd === null) {
      setGit(null);
      return;
    }
    let active = true;
    api.backend.gitInfo(cwd).then(
      (next) => {
        if (active) setGit(next);
      },
      () => {
        if (active) setGit(null);
      },
    );
    return () => {
      active = false;
    };
  }, [api.backend, cwd, version]);

  return git;
}
