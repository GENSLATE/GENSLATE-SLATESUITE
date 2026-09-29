/**
 * The terminal window's state and actions (`TerminalApi`): tabs and splits, the sessions in
 * them, settings, snippets, dialogs and panels. Components read it with `useTerminal()`.
 */
import { usePlatform, useTheme, useToast } from '@genslate/design-system';
import { commands } from '@genslate/tauri-bridge';
import { type ReactNode, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';

import type { FinishedCommand } from '../engine/pane-store';
import { resolvePath } from '../engine/path-links.util';
import type { TerminalBackend } from '../ipc/terminal.client';
import type {
  Profile,
  ProfileColor,
  Settings,
  Snippet,
  SnippetDraft,
  TerminalContext,
} from '../ipc/terminal.types';
import {
  activeTab,
  EMPTY_LAYOUT,
  type LayoutState,
  layoutReducer,
  tabOfPane,
} from '../model/layout.reducer';
import { findLeaf, leaves, type PaneLeaf, type SplitDirection } from '../model/pane-tree.util';
import { reviewPaste } from '../model/paste.util';
import { baseName, isRunnable } from '../model/path.util';
import { cdCommand, shellPath } from '../model/shell.util';
import { commandFor, isEnabled } from './commands.registry';
import { errorMessage } from './error-message.util';
import { loadLayout, loadScrollback, loadUiPrefs, saveUiPrefs } from './session.util';
import {
  type AssistantFocus,
  type DialogState,
  type SidePanelId,
  type TerminalApi,
  TerminalApiContext,
} from './terminal.context';
import { usePersistence } from './use-persistence.hook';
import { type SessionCallbacks, useSessionRegistry } from './use-session-registry.hook';

const SIDE_PANELS: readonly string[] = [
  'files',
  'sessions',
  'snippets',
  'history',
  'assistant',
  'workflows',
] satisfies readonly SidePanelId[];

/** Commands that run longer than this notify when they end out of sight. */
const NOTIFY_AFTER_MS = 10_000;
const FONT_RANGE = { min: 8, max: 32, default: 13 } as const;

let counter = 0;
/** A short unique id (tabs, panes and splits). */
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function firstLayout(context: TerminalContext, profiles: ReadonlySet<string>): LayoutState {
  const pane = (cwd: string | null): PaneLeaf => ({
    type: 'pane',
    id: newId('pane'),
    profileId: context.defaultProfileId,
    cwd,
  });
  const restored = context.settings.restoreSession ? loadLayout((id) => profiles.has(id)) : null;
  if (restored !== null) {
    return context.startCwd === null
      ? restored
      : layoutReducer(restored, {
          type: 'new-tab',
          id: newId('tab'),
          pane: pane(context.startCwd),
        });
  }
  if (context.profiles.length === 0) return EMPTY_LAYOUT;
  return layoutReducer(EMPTY_LAYOUT, {
    type: 'new-tab',
    id: newId('tab'),
    pane: pane(context.startCwd),
  });
}

interface LaunchRequest {
  readonly cwd: string | null;
  readonly profileId: string | null;
}

interface TerminalProviderProps {
  readonly backend: TerminalBackend;
  readonly context: TerminalContext;
  readonly children: ReactNode;
}

export function TerminalProvider({ backend, context, children }: TerminalProviderProps) {
  const platform = usePlatform();
  const toast = useToast();
  const { toggleTheme } = useTheme();
  const profiles = context.profiles;
  const [settings, setSettings] = useState<Settings>(context.settings);
  const [snippets, setSnippets] = useState<readonly Snippet[]>(context.snippets);
  const [layout, dispatch] = useReducer(layoutReducer, null, () =>
    firstLayout(context, new Set(profiles.map((profile) => profile.id))),
  );
  const [prefs] = useState(loadUiPrefs);
  const [sidePanel, setSidePanel] = useState<SidePanelId>(
    prefs !== null && SIDE_PANELS.includes(prefs.sidePanel)
      ? (prefs.sidePanel as SidePanelId)
      : 'files',
  );
  const [sidebarOpen, setSidebarOpen] = useState(prefs?.sidebarOpen ?? true);
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [commandBarPane, setCommandBarPane] = useState<string | null>(null);
  const [assistantFocus, setAssistantFocus] = useState<AssistantFocus | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [changedFolders, setChangedFolders] = useState<TerminalApi['changedFolders']>({
    version: 0,
    folders: [],
  });

  const callbacks = useRef<SessionCallbacks | null>(null);
  const registry = useSessionRegistry(backend, context.platform, settings, layout, callbacks);
  const store = registry.store;
  const tab = activeTab(layout);
  const activePaneId = tab?.activePaneId ?? null;

  // The default shell follows the setting once it names a shell that exists.
  const defaultProfileId = profiles.some((candidate) => candidate.id === settings.defaultProfile)
    ? settings.defaultProfile
    : context.defaultProfileId;

  const profile = (id: string): Profile => {
    const found = profiles.find((candidate) => candidate.id === id) ?? profiles[0];
    if (found === undefined) throw new Error('No shells were found on this computer.');
    return found;
  };

  const report = (title: string, error: unknown) => {
    toast.add({ title, description: errorMessage(error), type: 'error' });
  };

  const cwdOf = (paneId: string | null): string | null => {
    if (paneId === null) return null;
    const live = store.get(paneId)?.cwd;
    if (live != null) return live;
    for (const candidate of layout.tabs) {
      const leaf = findLeaf(candidate.root, paneId);
      if (leaf !== null) return leaf.cwd;
    }
    return null;
  };

  const leafFor = (profileId: string | undefined, cwd: string | null): PaneLeaf => ({
    type: 'pane',
    id: newId('pane'),
    profileId: profile(profileId ?? defaultProfileId).id,
    cwd,
  });

  /** What still runs in these panes (names for the close prompt). */
  const runningIn = async (paneIds: readonly string[]): Promise<readonly string[]> => {
    const busy = paneIds.flatMap((id) => {
      const state = store.get(id);
      return state?.busy === true ? [state.currentCommand ?? state.title] : [];
    });
    if (busy.length > 0) return busy;
    try {
      const infos = await backend.sessions(paneIds);
      return infos.flatMap((info) => (info.running === null ? [] : [info.running.name]));
    } catch {
      // Without process info, closing stays one click.
      return [];
    }
  };

  // Settings save optimistically. Answers can arrive out of order, so only the latest
  // request's answer is applied, and a failure rolls its key back to the last saved value.
  const settingRequests = useRef({ latest: 0, byKey: new Map<keyof Settings, number>() });
  const savedSettings = useRef(context.settings);
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const requests = settingRequests.current;
    const request = ++requests.latest;
    requests.byKey.set(key, request);
    setSettings((current) => ({ ...current, [key]: value }));
    backend.setSetting(key, value).then(
      (saved) => {
        savedSettings.current = saved;
        if (requests.latest === request) setSettings(saved);
      },
      (error: unknown) => {
        if (requests.byKey.get(key) === request) {
          setSettings((current) => ({ ...current, [key]: savedSettings.current[key] }));
        }
        report('Couldn’t save the setting', error);
      },
    );
  };

  const activeProfileKind = () => {
    const state = activePaneId === null ? undefined : store.get(activePaneId);
    return profile(state?.profileId ?? defaultProfileId).kind;
  };

  const api: TerminalApi = {
    backend,
    context,
    profiles,
    profile,
    defaultProfileId,
    settings,
    updateSetting,
    layout,
    tab,
    dispatch,
    store,
    activePaneId,
    session: (paneId) => registry.get(paneId),
    attachPane: (paneId, container) => {
      const owner = tabOfPane(layout, paneId);
      const leaf = owner === null ? null : findLeaf(owner.root, paneId);
      if (leaf === null) return;
      const restored = settings.restoreSession ? loadScrollback(paneId) : null;
      registry.ensure(paneId, profile(leaf.profileId), leaf.cwd, restored).attach(container);
    },
    detachPane: (paneId, container) => registry.get(paneId)?.detach(container),
    newTab: (options) => {
      const cwd = options?.cwd === undefined ? cwdOf(activePaneId) : options.cwd;
      dispatch({
        type: 'new-tab',
        id: newId('tab'),
        pane: leafFor(options?.profileId, cwd),
        ...(tab === null ? {} : { after: tab.id }),
      });
    },
    duplicateTab: (tabId) => {
      const source = tabId === undefined ? tab : layout.tabs.find((t) => t.id === tabId);
      const pane =
        source === null || source === undefined ? null : findLeaf(source.root, source.activePaneId);
      if (source == null || pane === null) return;
      dispatch({
        type: 'new-tab',
        id: newId('tab'),
        pane: leafFor(pane.profileId, cwdOf(pane.id)),
        after: source.id,
      });
    },
    split: (direction: SplitDirection, options) => {
      if (tab === null || activePaneId === null) return;
      const current = findLeaf(tab.root, activePaneId);
      dispatch({
        type: 'split',
        paneId: activePaneId,
        direction,
        pane: leafFor(
          options?.profileId ?? current?.profileId,
          options?.cwd ?? cwdOf(activePaneId),
        ),
        splitId: newId('split'),
      });
    },
    closePane: (paneId, confirmed = false) => {
      if (confirmed || !settings.confirmClose) {
        dispatch({ type: 'close-pane', paneId });
        return;
      }
      void runningIn([paneId]).then((running) => {
        if (running.length === 0) dispatch({ type: 'close-pane', paneId });
        else setDialog({ type: 'close', target: { kind: 'pane', id: paneId }, running });
      });
    },
    closeTab: (tabId, confirmed = false) => {
      const target = layout.tabs.find((candidate) => candidate.id === tabId);
      if (target === undefined) return;
      if (confirmed || !settings.confirmClose) {
        dispatch({ type: 'close-tab', id: tabId });
        return;
      }
      void runningIn(leaves(target.root).map((leaf) => leaf.id)).then((running) => {
        if (running.length === 0) dispatch({ type: 'close-tab', id: tabId });
        else setDialog({ type: 'close', target: { kind: 'tab', id: tabId }, running });
      });
    },
    focusPane: (paneId) => {
      dispatch({ type: 'focus-pane', paneId });
      registry.get(paneId)?.focus();
    },
    restartPane: (paneId) => registry.get(paneId)?.restart(),
    setTabColor: (tabId, color: ProfileColor | null) =>
      dispatch({ type: 'color-tab', id: tabId, color }),
    sendText: (text, options) => {
      const paneId = options?.paneId ?? activePaneId;
      const session = paneId === null ? undefined : registry.get(paneId);
      if (session === undefined) return;
      if (options?.run === true) session.send(`${text.replace(/\r?\n/g, '\r')}\r`);
      else session.paste(text);
      session.focus();
    },
    paste: (text, paneId, reviewed = false) => {
      const target = paneId ?? activePaneId;
      const session = target === null ? undefined : registry.get(target);
      if (session === undefined || target === null) return;
      const review = reviewPaste(text);
      if (!reviewed && settings.pasteWarning && review.risks.length > 0) {
        setDialog({ type: 'paste', paneId: target, text, review });
        return;
      }
      session.paste(text);
      session.focus();
    },
    pasteFromClipboard: () => {
      const read = navigator.clipboard?.readText();
      if (read === undefined) return;
      read.then(
        (text) => {
          if (text !== '') api.paste(text);
        },
        (error: unknown) => report('Couldn’t read the clipboard', error),
      );
    },
    copySelection: () => {
      const session = activePaneId === null ? undefined : registry.get(activePaneId);
      session?.copySelection();
    },
    copyText: (text, what) => {
      navigator.clipboard?.writeText(text).then(
        () => toast.add({ title: `${what} copied`, type: 'success' }),
        (error: unknown) => report('Couldn’t copy', error),
      );
    },
    insertPath: (path) => {
      const kind = activeProfileKind();
      api.sendText(`${shellPath(path, kind)} `);
    },
    changeFolder: (path) => {
      const state = activePaneId === null ? undefined : store.get(activePaneId);
      if (state === undefined || state.busy || state.status !== 'running') {
        api.newTab({ cwd: path });
        return;
      }
      api.sendText(cdCommand(path, activeProfileKind()), { run: true });
    },
    clearPane: () => {
      if (activePaneId !== null) registry.get(activePaneId)?.clear();
    },
    saveOutput: () => {
      const session = activePaneId === null ? undefined : registry.get(activePaneId);
      if (session === undefined) return;
      const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      backend.saveOutput(`terminal-${stamp}.txt`, session.text()).then(
        (path) => toast.add({ title: 'Output saved', description: path, type: 'success' }),
        (error: unknown) => report('Couldn’t save the output', error),
      );
    },
    openPath: (path) =>
      backend.openPath(path).catch((error: unknown) => report('Couldn’t open it', error)),
    revealPath: (path) =>
      backend.revealPath(path).catch((error: unknown) => report('Couldn’t show it', error)),
    openUrl: (url) => {
      commands.openExternal(url).catch((error: unknown) => report('Couldn’t open the link', error));
    },
    zoomFont: (delta) => {
      const size =
        delta === 'reset'
          ? FONT_RANGE.default
          : Math.min(FONT_RANGE.max, Math.max(FONT_RANGE.min, settings.fontSize + delta));
      if (size !== settings.fontSize) updateSetting('fontSize', size);
    },
    snippets,
    saveSnippet: async (snippet: SnippetDraft) => {
      try {
        setSnippets(await backend.saveSnippet(snippet));
        return true;
      } catch (error) {
        report('Couldn’t save the snippet', error);
        return false;
      }
    },
    deleteSnippet: (id) => {
      backend
        .deleteSnippet(id)
        .then(setSnippets, (error: unknown) => report('Couldn’t delete the snippet', error));
    },
    historyVersion,
    deleteHistory: (id) => {
      backend.deleteHistory(id).then(
        () => setHistoryVersion((version) => version + 1),
        (error: unknown) => report('Couldn’t remove it from history', error),
      );
    },
    clearHistory: () => {
      backend.clearHistory().then(
        () => {
          setHistoryVersion((version) => version + 1);
          toast.add({ title: 'History cleared', type: 'success' });
        },
        (error: unknown) => report('Couldn’t clear the history', error),
      );
    },
    changedFolders,
    findOpen,
    setFindOpen,
    dialog,
    openDialog: setDialog,
    closeDialog: () => setDialog({ type: 'none' }),
    paletteOpen,
    setPaletteOpen,
    sidePanel,
    setSidePanel,
    sidebarOpen,
    setSidebarOpen,
    commandBarPane,
    setCommandBarPane,
    assistantFocus,
    askAssistant: (focus) => {
      const paneId = focus?.paneId ?? activePaneId;
      setAssistantFocus(
        paneId === null
          ? null
          : { paneId, command: focus?.command ?? store.get(paneId)?.lastCommand ?? null },
      );
      setSidePanel('assistant');
      setSidebarOpen(true);
    },
    toggleTheme,
    report,
  };

  // Sessions call back through this ref, so they always see the current state.
  useLayoutEffect(() => {
    callbacks.current = {
      settings,
      isAppShortcut: (event) => {
        const entry = commandFor(event, platform);
        return entry !== undefined && isEnabled(entry, api);
      },
      onInput: (paneId, bytes) => {
        const owner = tabOfPane(layout, paneId);
        const targets =
          owner?.broadcast === true ? leaves(owner.root).map((leaf) => leaf.id) : [paneId];
        for (const id of targets) registry.get(id)?.sendBytes(bytes);
      },
      onPaste: (paneId, text) => api.paste(text, paneId),
      onCommandFinished: (paneId, command: FinishedCommand) => notifyWhenDone(paneId, command),
      onNaturalLanguage: (paneId) => setCommandBarPane(paneId),
      onExplain: (paneId, command) => api.askAssistant({ paneId, command }),
      onOpenUrl: (url) => api.openUrl(url),
      onOpenPath: (paneId, path) => {
        const target = resolvePath(path, cwdOf(paneId), context.home);
        // A link in output is anyone's text: show programs and scripts, never run them.
        if (!isRunnable(target)) {
          api.openPath(target);
          return;
        }
        api.revealPath(target);
        toast.add({ title: `Showing ${baseName(target)} instead of running it`, type: 'info' });
      },
      onFocus: (paneId) => {
        if (paneId !== activePaneId) dispatch({ type: 'focus-pane', paneId });
      },
    };
  });

  function notifyWhenDone(paneId: string, command: FinishedCommand) {
    if (!settings.notifyWhenDone || command.durationMs < NOTIFY_AFTER_MS) return;
    const visible = activePaneId === paneId && document.hasFocus();
    if (visible) return;
    const failed = command.exitCode !== null && command.exitCode !== 0;
    toast.add({
      title: failed ? 'A command failed' : 'A command finished',
      description: command.command,
      type: failed ? 'error' : 'success',
    });
  }

  // A second launch (`--cwd`, "Open in Terminal") opens a tab; read through a ref so the
  // subscription below stays put while the layout changes.
  const launch = useRef<(request: LaunchRequest) => void>(() => undefined);
  useLayoutEffect(() => {
    launch.current = (request) =>
      api.newTab({
        ...(request.profileId === null ? {} : { profileId: request.profileId }),
        cwd: request.cwd,
      });
  });

  // Backend events: shells that exit, finished commands (history), folder changes, and a second
  // launch asking for a new tab.
  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    backend
      .subscribe({
        exit: (id, code) => registry.get(id)?.markExited(code),
        command: () => setHistoryVersion((version) => version + 1),
        filesChanged: (folders) =>
          setChangedFolders((current) => ({ version: current.version + 1, folders })),
        open: (request) => launch.current(request),
      })
      .then(
        (unsubscribe) => {
          if (active) stop = unsubscribe;
          else unsubscribe();
        },
        (error: unknown) => console.warn('terminal events unavailable', error),
      );
    return () => {
      active = false;
      stop?.();
    };
  }, [backend, registry]);

  // Focus follows the active pane.
  const overlayOpen = dialog.type !== 'none' || paletteOpen;
  useEffect(() => {
    if (overlayOpen || activePaneId === null) return;
    const frame = requestAnimationFrame(() => registry.get(activePaneId)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [registry, activePaneId, overlayOpen]);

  useEffect(() => {
    saveUiPrefs({ sidePanel, sidebarOpen });
  }, [sidePanel, sidebarOpen]);

  usePersistence(layout, registry, settings.restoreSession);

  return <TerminalApiContext value={api}>{children}</TerminalApiContext>;
}
