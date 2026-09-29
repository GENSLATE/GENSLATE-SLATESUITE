import {
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSubmenuRoot,
  ContextMenuSubmenuTrigger,
  MenuPopup,
  type Platform,
  type WindowContextTarget,
} from '@genslate/design-system';

import { command, shortcutFor } from '../../app/commands.registry';
import type { TerminalApi } from '../../app/terminal.context';
import { baseName, isInside } from '../../model/path.util';
import { COLOR_CHOICES } from '../tabs/profile-visual.util';

const REVEAL_LABELS: Readonly<Record<Platform, string>> = {
  macos: 'Show in Finder',
  windows: 'Show in File Explorer',
  linux: 'Show in file manager',
  web: 'Show in file manager',
};

/** The terminal's rows for a right-click, by area (`data-context-zone`). */
export function terminalMenuItems(
  target: WindowContextTarget,
  api: TerminalApi,
  platform: Platform,
) {
  if (target.kind !== 'content') return null;
  const element = target.element;
  const attribute = (name: string) => element.closest(`[${name}]`)?.getAttribute(name) ?? null;

  switch (target.zone) {
    case 'tab': {
      const tab = api.layout.tabs.find((candidate) => candidate.id === attribute('data-tab-id'));
      return tab === undefined ? null : <TabItems api={api} tabId={tab.id} platform={platform} />;
    }
    case 'file-node': {
      const path = attribute('data-path');
      if (path === null) return null;
      const isDir = element.closest('[data-path]')?.hasAttribute('data-dir') === true;
      return <FileItems api={api} path={path} isDir={isDir} platform={platform} />;
    }
    case 'session': {
      const paneId = attribute('data-pane-id');
      return paneId === null ? null : <SessionItems api={api} paneId={paneId} />;
    }
    case 'snippet': {
      const snippet = api.snippets.find((entry) => entry.id === attribute('data-snippet-id'));
      if (snippet === undefined) return null;
      return (
        <>
          <ContextMenuItem
            icon="codicon:play"
            onClick={() => api.sendText(snippet.command, { run: true })}
          >
            Run
          </ContextMenuItem>
          <ContextMenuItem icon="codicon:insert" onClick={() => api.sendText(snippet.command)}>
            Type without running
          </ContextMenuItem>
          <ContextMenuItem
            icon="codicon:copy"
            onClick={() => api.copyText(snippet.command, 'Command')}
          >
            Copy command
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            icon="codicon:edit"
            onClick={() => api.openDialog({ type: 'snippet', snippet })}
          >
            Edit…
          </ContextMenuItem>
          <ContextMenuItem
            icon="codicon:trash"
            tone="danger"
            onClick={() => api.deleteSnippet(snippet.id)}
          >
            Delete
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      );
    }
    case 'history': {
      const id = Number(attribute('data-history-id'));
      const commandLine = element.closest('[data-history-id]')?.querySelector('code')?.textContent;
      if (!Number.isFinite(id) || commandLine == null) return null;
      return (
        <>
          <ContextMenuItem
            icon="codicon:play"
            onClick={() => api.sendText(commandLine, { run: true })}
          >
            Run again
          </ContextMenuItem>
          <ContextMenuItem icon="codicon:insert" onClick={() => api.sendText(commandLine)}>
            Type without running
          </ContextMenuItem>
          <ContextMenuItem icon="codicon:copy" onClick={() => api.copyText(commandLine, 'Command')}>
            Copy
          </ContextMenuItem>
          <ContextMenuItem
            icon="codicon:symbol-snippet"
            onClick={() =>
              api.openDialog({
                type: 'snippet',
                snippet: { id: null, name: '', command: commandLine, description: '', run: true },
              })
            }
          >
            Save as a snippet…
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem icon="codicon:trash" tone="danger" onClick={() => api.deleteHistory(id)}>
            Remove from history
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      );
    }
    default:
      return null;
  }
}

function TabItems({
  api,
  tabId,
  platform,
}: {
  readonly api: TerminalApi;
  readonly tabId: string;
  readonly platform: Platform;
}) {
  const tab = api.layout.tabs.find((candidate) => candidate.id === tabId);
  if (tab === undefined) return null;
  const keys = (id: string) => shortcutFor(command(id), platform);

  return (
    <>
      <ContextMenuItem
        icon="codicon:copy"
        shortcut={keys('duplicate-tab')}
        onClick={() => api.duplicateTab(tabId)}
      >
        Duplicate tab
      </ContextMenuItem>
      <ContextMenuItem
        icon="codicon:edit"
        shortcut="f2"
        onClick={() => api.openDialog({ type: 'rename-tab', tabId })}
      >
        Rename tab…
      </ContextMenuItem>
      <ContextMenuSubmenuRoot>
        <ContextMenuSubmenuTrigger icon="codicon:symbol-color">Colour</ContextMenuSubmenuTrigger>
        <MenuPopup>
          <ContextMenuRadioGroup
            value={tab.color ?? 'none'}
            onValueChange={(value: string) =>
              api.setTabColor(
                tabId,
                COLOR_CHOICES.find((choice) => choice.value === value)?.value ?? null,
              )
            }
          >
            <ContextMenuRadioItem value="none">None</ContextMenuRadioItem>
            {COLOR_CHOICES.map((choice) => (
              <ContextMenuRadioItem key={choice.value} value={choice.value}>
                {choice.label}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </MenuPopup>
      </ContextMenuSubmenuRoot>
      <ContextMenuSeparator />
      <ContextMenuItem
        icon="codicon:close-all"
        disabled={api.layout.tabs.length < 2}
        onClick={() => api.dispatch({ type: 'close-other-tabs', id: tabId })}
      >
        Close other tabs
      </ContextMenuItem>
      <ContextMenuItem
        icon="codicon:close"
        tone="danger"
        shortcut={keys('close-tab')}
        onClick={() => api.closeTab(tabId)}
      >
        Close tab
      </ContextMenuItem>
      <ContextMenuSeparator />
    </>
  );
}

function FileItems({
  api,
  path,
  isDir,
  platform,
}: {
  readonly api: TerminalApi;
  readonly path: string;
  readonly isDir: boolean;
  readonly platform: Platform;
}) {
  const cwd = api.activePaneId === null ? null : (api.store.get(api.activePaneId)?.cwd ?? null);
  const relative =
    cwd !== null && isInside(path, cwd) ? path.slice(cwd.replace(/[\\/]+$/, '').length + 1) : null;

  return (
    <>
      {isDir ? (
        <>
          <ContextMenuItem icon="codicon:terminal" onClick={() => api.changeFolder(path)}>
            Go to {baseName(path)} (cd)
          </ContextMenuItem>
          <ContextMenuItem icon="codicon:add" onClick={() => api.newTab({ cwd: path })}>
            Open in a new tab
          </ContextMenuItem>
          <ContextMenuItem
            icon="codicon:split-horizontal"
            onClick={() => api.split('row', { cwd: path })}
          >
            Open in a split
          </ContextMenuItem>
        </>
      ) : (
        <ContextMenuItem icon="codicon:go-to-file" onClick={() => api.openPath(path)}>
          Open
        </ContextMenuItem>
      )}
      <ContextMenuItem icon="codicon:insert" onClick={() => api.insertPath(relative ?? path)}>
        Insert path
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem icon="codicon:copy" onClick={() => api.copyText(path, 'Path')}>
        Copy path
      </ContextMenuItem>
      {relative === null ? null : (
        <ContextMenuItem icon="codicon:copy" onClick={() => api.copyText(relative, 'Path')}>
          Copy relative path
        </ContextMenuItem>
      )}
      <ContextMenuItem icon="codicon:folder-opened" onClick={() => api.revealPath(path)}>
        {REVEAL_LABELS[platform]}
      </ContextMenuItem>
      <ContextMenuSeparator />
    </>
  );
}

function SessionItems({ api, paneId }: { readonly api: TerminalApi; readonly paneId: string }) {
  const state = api.store.get(paneId);
  if (state === undefined) return null;
  const cwd = state.cwd;
  return (
    <>
      <ContextMenuItem icon="codicon:debug-restart" onClick={() => api.restartPane(paneId)}>
        Restart shell
      </ContextMenuItem>
      {cwd === null ? null : (
        <ContextMenuItem icon="codicon:copy" onClick={() => api.copyText(cwd, 'Path')}>
          Copy folder path
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem icon="codicon:close" tone="danger" onClick={() => api.closePane(paneId)}>
        Close
      </ContextMenuItem>
      <ContextMenuSeparator />
    </>
  );
}
