import { useToast } from '@genslate/design-system';
import { isCommandError } from '@genslate/tauri-bridge';
import { useEffect, useRef, useState } from 'react';

import { optionId } from '../features/apps/app-row.component';
import { flatten, groupApps, isLaunchable, searchApps } from '../features/apps/catalog.model';
import { paramsFor, parseSlash, type SlashSuggestion } from '../features/command-bar/slash.model';
import type { ActionSpec, AppEntry, Source, StatusMode } from '../ipc/launcher.types';
import { useLauncher } from './launcher.context';

/** What the well shows. Only `tools` widens the frame. */
export type View =
  | { readonly kind: 'apps' }
  | { readonly kind: 'tools' }
  | { readonly kind: 'help' }
  | { readonly kind: 'details'; readonly id: string }
  | { readonly kind: 'args'; readonly id: string };

const APPS: View = { kind: 'apps' };
/** Matches `--gs-duration-slow`: the frame finishes collapsing before the hit area shrinks. */
const COLLAPSE_MS = 360;
const LAUNCH_POP_MS = 420;

/** All launcher UI state and behaviour; components stay presentational. */
export function useLauncherController() {
  const { backend, context, settings, list, pinned, showCount, showView } = useLauncher();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<View>(APPS);
  const [tab, setTab] = useState<Source>('genslate');
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set(['unavailable']));
  const [launchingId, setLaunchingId] = useState<string | undefined>();
  const [aiOpen, setAiOpen] = useState(false);
  const [statusMode, setStatusMode] = useState<StatusMode>(settings.config.status.mode);
  const [slashHint, setSlashHint] = useState<string | undefined>();

  const tabs = list.tabs;
  const currentTab = tabs.some((info) => info.source === tab) ? tab : 'genslate';
  const slash = parseSlash(query, context.actions, list.apps);
  const searching = !slash.active && query.trim() !== '';
  const groups = searching ? null : groupApps(list.apps, currentTab, list.recent);
  const results = searching ? searchApps(list.apps, query) : [];
  const navigable: readonly AppEntry[] = groups === null ? results : flatten(groups, collapsed);
  const count = slash.active ? slash.suggestions.length : navigable.length;
  const index = count === 0 ? -1 : Math.min(activeIndex, count - 1);
  const activeApp = slash.active ? undefined : navigable[index];
  const expanded = view.kind === 'tools';

  // Every show: fresh search, the requested view (apps unless the tray asked for help), focus
  // in the bar.
  useEffect(() => {
    if (showCount === 0) return;
    setQuery('');
    setActiveIndex(0);
    setView(showView === 'help' ? { kind: 'help' } : APPS);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [showCount, showView]);

  // Widen the shell's hit area at once; shrink it after the collapse animation.
  useEffect(() => {
    if (expanded) {
      backend.setExpanded(true).catch(reportError);
      return;
    }
    const timer = setTimeout(() => backend.setExpanded(false).catch(reportError), COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [backend, expanded]);

  function notify(error: unknown) {
    const message = isCommandError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
    toast.add({ title: 'Something went wrong', description: message, type: 'error' });
  }

  function changeQuery(next: string) {
    setQuery(next);
    setActiveIndex(0);
    setSlashHint(undefined);
    if (next !== '' && view.kind !== 'apps' && view.kind !== 'tools') setView(APPS);
  }

  function launch(app: AppEntry, args?: readonly string[]) {
    if (!isLaunchable(app)) {
      toast.add({
        title:
          app.status === 'not-installed'
            ? `${app.name} isn't installed yet`
            : `${app.name} can't start`,
        description:
          app.status === 'not-installed'
            ? `Add it to programs/genslate/${app.id.split('/')[1] ?? ''}/ and it appears here.`
            : 'Its program or metadata is missing — reinstall it.',
        type: 'info',
      });
      return;
    }
    setLaunchingId(app.id);
    setTimeout(() => setLaunchingId(undefined), LAUNCH_POP_MS);
    backend.launch(app.id, args).then(() => {
      setQuery('');
      setView(APPS);
    }, notify);
  }

  function toggleFavorite(app: AppEntry) {
    backend.setOverride(app.id, { favorite: !app.favorite }).then(() => {
      toast.add({
        title: app.favorite
          ? `Removed ${app.name} from Favorites`
          : `Added ${app.name} to Favorites`,
        type: 'success',
      });
    }, notify);
  }

  function toggleTools() {
    setView((current) => (current.kind === 'tools' ? APPS : { kind: 'tools' }));
  }

  function togglePin() {
    backend.setPinned(!pinned).catch(notify);
  }

  function changeTab(source: Source) {
    setTab(source);
    setActiveIndex(0);
    setView(APPS);
  }

  function changeStatusMode(mode: StatusMode) {
    setStatusMode(mode);
    backend.setSetting('statusMode', mode).catch(notify);
  }

  function execute(action: ActionSpec, params: Readonly<Record<string, string>>) {
    setQuery('');
    switch (action.id) {
      case 'tab': {
        const source = params['source'];
        if (source === 'genslate' || source === 'portableapps' || source === 'portapps')
          changeTab(source);
        return;
      }
      case 'tools':
        toggleTools();
        return;
      case 'help':
        setView({ kind: 'help' });
        return;
      case 'ask':
        setAiOpen(true);
        return;
      case 'pin':
        togglePin();
        return;
      case 'hide':
        backend.hide().catch(notify);
        return;
      case 'quit':
        backend.quit().catch(notify);
        return;
      default:
        backend.runAction(action.id, params).then((outcome) => {
          if (outcome.kind === 'done' && outcome.message !== null)
            toast.add({ title: outcome.message, type: 'success' });
        }, notify);
    }
  }

  function choose(suggestion: SlashSuggestion | undefined) {
    if (suggestion?.kind === 'action') {
      if (suggestion.action.params.length > 0) changeQuery(`/${suggestion.action.id} `);
      else execute(suggestion.action, {});
      return;
    }
    if (suggestion?.kind === 'value') {
      execute(suggestion.action, { [suggestion.param.name]: suggestion.value });
      return;
    }
    if (slash.action === undefined) return;
    const parsed = paramsFor(slash.action, slash.argument);
    if ('error' in parsed) setSlashHint(parsed.error);
    else execute(slash.action, parsed.params);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const move = (delta: number) => {
      event.preventDefault();
      if (count > 0) setActiveIndex((index + delta + count) % count);
    };
    switch (event.key) {
      case 'ArrowDown':
        return move(1);
      case 'ArrowUp':
        return move(-1);
      case 'Enter':
        event.preventDefault();
        if (slash.active) choose(slash.suggestions[index]);
        else if (activeApp !== undefined) launch(activeApp);
        return;
      case 'Tab':
        if (slash.active && slash.suggestions[index]?.kind === 'action') {
          event.preventDefault();
          choose(slash.suggestions[index]);
        }
        return;
      case 'Escape':
        event.preventDefault();
        if (query !== '') changeQuery('');
        else if (view.kind !== 'apps') setView(APPS);
        else backend.hide().catch(notify);
        return;
      case 'ContextMenu':
      case 'F10':
        if (event.key === 'F10' && !event.shiftKey) return;
        if (activeApp !== undefined) openContextMenu(optionId(index), event);
        return;
      default:
    }
  }

  return {
    inputRef,
    view,
    setView,
    tab: currentTab,
    changeTab,
    query,
    changeQuery,
    slash,
    slashHint,
    activeIndex: index,
    setActiveIndex,
    activeApp,
    groups,
    results,
    collapsed,
    toggleGroup: (id: string) =>
      setCollapsed((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    launchingId,
    expanded,
    aiOpen,
    setAiOpen,
    statusMode,
    changeStatusMode,
    launch,
    toggleFavorite,
    toggleTools,
    togglePin,
    choose,
    onKeyDown,
    notify,
  };
}

/** Opens the list's context menu on a row from the keyboard (Shift+F10 / Menu key). */
function openContextMenu(rowId: string, event: React.KeyboardEvent) {
  event.preventDefault();
  const row = document.getElementById(rowId);
  if (row === null) return;
  const rect = row.getBoundingClientRect();
  row.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 48,
      clientY: rect.top + rect.height / 2,
    }),
  );
}

function reportError(error: unknown) {
  console.warn('launcher', error);
}
