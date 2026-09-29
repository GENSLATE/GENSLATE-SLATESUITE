/**
 * Every terminal action as a typed command: the palette lists them, the hotkeys run them and
 * the menus share their labels, icons and shortcuts. Shortcuts follow Windows Terminal on
 * Windows and Linux (Ctrl+Shift, so Ctrl+W, Ctrl+T and friends still reach the shell) and the
 * usual ⌘ keys on macOS. The `AI` group is reserved for the assistant: listed, not run yet.
 */
import {
  type CodiconRef,
  matchesHotkey,
  type Platform,
  parseHotkey,
  usesMacKeys,
} from '@genslate/design-system';

import { leaves } from '../model/pane-tree.util';
import type { SidePanelId, TerminalApi } from './terminal.context';

export type CommandGroup = 'Shell' | 'Tabs' | 'Panes' | 'Edit' | 'View' | 'AI' | 'Help';

export interface TerminalCommand {
  readonly id: string;
  readonly label: string;
  readonly group: CommandGroup;
  readonly icon?: CodiconRef;
  /** Windows and Linux (and the browser). */
  readonly shortcut?: string;
  /** macOS, when it differs. */
  readonly macShortcut?: string;
  /** Platforms where the webview handles the keys itself (shown, never bound). */
  readonly native?: readonly Platform[];
  readonly keywords?: readonly string[];
  /** Reserved for the assistant: listed, never run yet. */
  readonly soon?: boolean;
  /** Bound, but left out of the palette (numbered variants the palette lists better). */
  readonly hidden?: boolean;
  enabled?(api: TerminalApi): boolean;
  run(api: TerminalApi): void;
}

const hasPane = (api: TerminalApi) => api.activePaneId !== null;
const paneCount = (api: TerminalApi) => (api.tab === null ? 0 : leaves(api.tab.root).length);
const hasSplits = (api: TerminalApi) => paneCount(api) > 1 && api.tab?.zoomedPaneId === null;
const activeSession = (api: TerminalApi) =>
  api.activePaneId === null ? undefined : api.session(api.activePaneId);

const panel = (
  id: SidePanelId,
  label: string,
  icon: CodiconRef,
  shortcut?: string,
  macShortcut?: string,
): TerminalCommand => ({
  id: `panel-${id}`,
  label,
  group: 'View',
  icon,
  ...(shortcut === undefined ? {} : { shortcut }),
  ...(macShortcut === undefined ? {} : { macShortcut }),
  run: (api) => {
    if (api.sidebarOpen && api.sidePanel === id) {
      api.setSidebarOpen(false);
      return;
    }
    api.setSidePanel(id);
    api.setSidebarOpen(true);
  },
});

const soon = (
  id: string,
  label: string,
  icon: CodiconRef,
  keywords: readonly string[],
): TerminalCommand => ({
  id,
  label,
  group: 'AI',
  icon,
  keywords: ['ai', 'assistant', ...keywords],
  soon: true,
  enabled: () => false,
  run: () => undefined,
});

/** Nine commands, one per number key. */
const numbered = (make: (n: number) => TerminalCommand): readonly TerminalCommand[] =>
  Array.from({ length: 9 }, (_, index) => make(index + 1));

export const COMMANDS: readonly TerminalCommand[] = [
  // Tabs
  {
    id: 'new-tab',
    label: 'New tab',
    group: 'Tabs',
    icon: 'codicon:add',
    shortcut: 'ctrl+shift+t',
    macShortcut: 'cmd+t',
    run: (api) => api.newTab(),
  },
  {
    id: 'duplicate-tab',
    label: 'Duplicate tab',
    group: 'Tabs',
    icon: 'codicon:copy',
    shortcut: 'ctrl+shift+d',
    enabled: (api) => api.tab !== null,
    run: (api) => api.duplicateTab(),
  },
  {
    id: 'rename-tab',
    label: 'Rename tab…',
    group: 'Tabs',
    icon: 'codicon:edit',
    enabled: (api) => api.tab !== null,
    run: (api) => {
      if (api.tab !== null) api.openDialog({ type: 'rename-tab', tabId: api.tab.id });
    },
  },
  {
    id: 'close-tab',
    label: 'Close tab',
    group: 'Tabs',
    icon: 'codicon:close-all',
    macShortcut: 'cmd+shift+w',
    enabled: (api) => api.tab !== null,
    run: (api) => {
      if (api.tab !== null) api.closeTab(api.tab.id);
    },
  },
  {
    id: 'next-tab',
    label: 'Next tab',
    group: 'Tabs',
    icon: 'codicon:chevron-right',
    shortcut: 'ctrl+tab',
    enabled: (api) => api.layout.tabs.length > 1,
    run: (api) => api.dispatch({ type: 'cycle-tab', delta: 1 }),
  },
  {
    id: 'previous-tab',
    label: 'Previous tab',
    group: 'Tabs',
    icon: 'codicon:chevron-left',
    shortcut: 'ctrl+shift+tab',
    enabled: (api) => api.layout.tabs.length > 1,
    run: (api) => api.dispatch({ type: 'cycle-tab', delta: -1 }),
  },

  ...numbered((n) => ({
    id: `new-tab-${n}`,
    label: `New tab with profile ${n}`,
    group: 'Tabs',
    icon: 'codicon:terminal',
    shortcut: `ctrl+shift+${n}`,
    macShortcut: `cmd+alt+${n}`,
    hidden: true,
    enabled: (api) => api.profiles[n - 1] !== undefined,
    run: (api) => {
      const profile = api.profiles[n - 1];
      if (profile !== undefined) api.newTab({ profileId: profile.id });
    },
  })),
  ...numbered((n) => ({
    id: `go-to-tab-${n}`,
    label: `Go to tab ${n}`,
    group: 'Tabs',
    icon: 'codicon:window',
    shortcut: `ctrl+alt+${n}`,
    macShortcut: `cmd+${n}`,
    hidden: true,
    enabled: (api) => api.layout.tabs[n - 1] !== undefined,
    run: (api) => {
      const tab = api.layout.tabs[n - 1];
      if (tab !== undefined) api.dispatch({ type: 'activate-tab', id: tab.id });
    },
  })),

  // Panes
  {
    id: 'split-right',
    label: 'Split right',
    group: 'Panes',
    icon: 'codicon:split-horizontal',
    shortcut: 'alt+shift+=',
    macShortcut: 'cmd+d',
    keywords: ['pane', 'vertical', 'side by side'],
    enabled: hasPane,
    run: (api) => api.split('row'),
  },
  {
    id: 'split-down',
    label: 'Split down',
    group: 'Panes',
    icon: 'codicon:split-vertical',
    shortcut: 'alt+shift+-',
    macShortcut: 'cmd+shift+d',
    keywords: ['pane', 'horizontal', 'below'],
    enabled: hasPane,
    run: (api) => api.split('column'),
  },
  {
    id: 'close-pane',
    label: 'Close pane',
    group: 'Panes',
    icon: 'codicon:close',
    shortcut: 'ctrl+shift+w',
    macShortcut: 'cmd+w',
    enabled: hasPane,
    run: (api) => {
      if (api.activePaneId !== null) api.closePane(api.activePaneId);
    },
  },
  {
    id: 'zoom-pane',
    label: 'Maximize pane',
    group: 'Panes',
    icon: 'codicon:screen-full',
    shortcut: 'ctrl+shift+enter',
    macShortcut: 'cmd+shift+enter',
    keywords: ['zoom', 'full', 'restore'],
    enabled: (api) => paneCount(api) > 1,
    run: (api) => api.dispatch({ type: 'toggle-zoom' }),
  },
  {
    id: 'equalize',
    label: 'Even out panes',
    group: 'Panes',
    icon: 'codicon:layout',
    enabled: (api) => paneCount(api) > 1,
    run: (api) => {
      if (api.tab !== null) api.dispatch({ type: 'equalize', tabId: api.tab.id });
    },
  },
  {
    id: 'focus-left',
    label: 'Focus the pane on the left',
    group: 'Panes',
    icon: 'codicon:arrow-left',
    shortcut: 'alt+left',
    macShortcut: 'cmd+alt+left',
    enabled: hasSplits,
    run: (api) => api.dispatch({ type: 'focus-direction', direction: 'left' }),
  },
  {
    id: 'focus-right',
    label: 'Focus the pane on the right',
    group: 'Panes',
    icon: 'codicon:arrow-right',
    shortcut: 'alt+right',
    macShortcut: 'cmd+alt+right',
    enabled: hasSplits,
    run: (api) => api.dispatch({ type: 'focus-direction', direction: 'right' }),
  },
  {
    id: 'focus-up',
    label: 'Focus the pane above',
    group: 'Panes',
    icon: 'codicon:arrow-up',
    shortcut: 'alt+up',
    macShortcut: 'cmd+alt+up',
    enabled: hasSplits,
    run: (api) => api.dispatch({ type: 'focus-direction', direction: 'up' }),
  },
  {
    id: 'focus-down',
    label: 'Focus the pane below',
    group: 'Panes',
    icon: 'codicon:arrow-down',
    shortcut: 'alt+down',
    macShortcut: 'cmd+alt+down',
    enabled: hasSplits,
    run: (api) => api.dispatch({ type: 'focus-direction', direction: 'down' }),
  },
  {
    id: 'broadcast',
    label: 'Type in every pane of this tab',
    group: 'Panes',
    icon: 'codicon:broadcast',
    keywords: ['broadcast', 'sync', 'input', 'all panes'],
    enabled: (api) => paneCount(api) > 1,
    run: (api) => {
      if (api.tab !== null) api.dispatch({ type: 'toggle-broadcast', tabId: api.tab.id });
    },
  },

  // Shell
  {
    id: 'restart',
    label: 'Restart shell',
    group: 'Shell',
    icon: 'codicon:debug-restart',
    enabled: (api) => {
      const status =
        api.activePaneId === null ? undefined : api.store.get(api.activePaneId)?.status;
      return status === 'exited' || status === 'failed';
    },
    run: (api) => {
      if (api.activePaneId !== null) api.restartPane(api.activePaneId);
    },
  },
  {
    id: 'clear',
    label: 'Clear',
    group: 'Shell',
    icon: 'codicon:clear-all',
    shortcut: 'ctrl+shift+k',
    macShortcut: 'cmd+k',
    keywords: ['cls', 'reset', 'scrollback'],
    enabled: hasPane,
    run: (api) => api.clearPane(),
  },
  {
    id: 'previous-command',
    label: 'Go to previous command',
    group: 'Shell',
    icon: 'codicon:arrow-up',
    shortcut: 'ctrl+up',
    macShortcut: 'cmd+up',
    keywords: ['jump', 'scroll', 'prompt'],
    enabled: (api) => activeSession(api)?.hasCommands() ?? false,
    run: (api) => activeSession(api)?.jumpToCommand(-1),
  },
  {
    id: 'next-command',
    label: 'Go to next command',
    group: 'Shell',
    icon: 'codicon:arrow-down',
    shortcut: 'ctrl+down',
    macShortcut: 'cmd+down',
    keywords: ['jump', 'scroll', 'prompt'],
    enabled: (api) => activeSession(api)?.hasCommands() ?? false,
    run: (api) => activeSession(api)?.jumpToCommand(1),
  },
  {
    id: 'copy-last-output',
    label: 'Copy the last command’s output',
    group: 'Shell',
    icon: 'codicon:output',
    enabled: (api) => activeSession(api)?.hasCommands() ?? false,
    run: (api) => {
      const output = activeSession(api)?.lastOutput();
      if (output != null) api.copyText(output, 'Output');
    },
  },
  {
    id: 'select-last-output',
    label: 'Select the last command’s output',
    group: 'Shell',
    icon: 'codicon:list-selection',
    enabled: (api) => activeSession(api)?.hasCommands() ?? false,
    run: (api) => {
      activeSession(api)?.selectLastOutput();
    },
  },
  {
    id: 'save-output',
    label: 'Save output to a file',
    group: 'Shell',
    icon: 'codicon:save',
    shortcut: 'ctrl+shift+s',
    macShortcut: 'cmd+s',
    keywords: ['export', 'scrollback', 'log'],
    enabled: hasPane,
    run: (api) => api.saveOutput(),
  },

  // Edit
  {
    id: 'copy',
    label: 'Copy',
    group: 'Edit',
    icon: 'codicon:copy',
    shortcut: 'ctrl+shift+c',
    macShortcut: 'cmd+c',
    native: ['macos'],
    enabled: (api) => activeSession(api)?.hasSelection() ?? false,
    run: (api) => api.copySelection(),
  },
  {
    id: 'paste',
    label: 'Paste',
    group: 'Edit',
    icon: 'codicon:clippy',
    shortcut: 'ctrl+shift+v',
    macShortcut: 'cmd+v',
    native: ['macos', 'windows', 'linux', 'web'],
    enabled: hasPane,
    run: (api) => api.pasteFromClipboard(),
  },
  {
    id: 'select-all',
    label: 'Select all',
    group: 'Edit',
    icon: 'codicon:list-selection',
    shortcut: 'ctrl+shift+a',
    macShortcut: 'cmd+a',
    enabled: hasPane,
    run: (api) => activeSession(api)?.selectAll(),
  },
  {
    id: 'find',
    label: 'Find',
    group: 'Edit',
    icon: 'codicon:search',
    shortcut: 'ctrl+shift+f',
    macShortcut: 'cmd+f',
    keywords: ['search', 'scrollback'],
    enabled: hasPane,
    run: (api) => api.setFindOpen(true),
  },

  // View
  {
    id: 'toggle-sidebar',
    label: 'Toggle the side panel',
    group: 'View',
    icon: 'codicon:layout-sidebar-left',
    shortcut: 'ctrl+shift+b',
    macShortcut: 'cmd+b',
    run: (api) => api.setSidebarOpen(!api.sidebarOpen),
  },
  panel('files', 'Show files', 'codicon:files', 'ctrl+shift+e', 'cmd+shift+e'),
  panel('sessions', 'Show sessions', 'codicon:terminal', 'ctrl+shift+u', 'cmd+shift+u'),
  panel('snippets', 'Show snippets', 'codicon:symbol-snippet'),
  panel('history', 'Show command history', 'codicon:history', 'ctrl+shift+h', 'cmd+shift+h'),
  {
    id: 'font-bigger',
    label: 'Bigger text',
    group: 'View',
    icon: 'codicon:zoom-in',
    shortcut: 'mod+=',
    run: (api) => api.zoomFont(1),
  },
  {
    id: 'font-smaller',
    label: 'Smaller text',
    group: 'View',
    icon: 'codicon:zoom-out',
    shortcut: 'mod+-',
    run: (api) => api.zoomFont(-1),
  },
  {
    id: 'font-reset',
    label: 'Reset text size',
    group: 'View',
    icon: 'codicon:text-size',
    shortcut: 'mod+0',
    run: (api) => api.zoomFont('reset'),
  },
  {
    id: 'toggle-theme',
    label: 'Switch light and dark theme',
    group: 'View',
    icon: 'codicon:color-mode',
    shortcut: 'ctrl+shift+l',
    macShortcut: 'cmd+shift+l',
    keywords: ['theme', 'dark', 'light', 'nord', 'appearance'],
    run: (api) => api.toggleTheme(),
  },
  {
    id: 'settings',
    label: 'Settings',
    group: 'View',
    icon: 'codicon:settings-gear',
    shortcut: 'mod+,',
    keywords: ['preferences', 'options', 'font', 'cursor'],
    run: (api) => api.openDialog({ type: 'settings' }),
  },

  // Help
  {
    id: 'palette',
    label: 'Command palette',
    group: 'Help',
    icon: 'codicon:terminal',
    shortcut: 'ctrl+shift+p',
    macShortcut: 'cmd+shift+p',
    run: (api) => api.setPaletteOpen(true),
  },
  {
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    group: 'Help',
    icon: 'codicon:record-keys',
    shortcut: 'ctrl+shift+/',
    macShortcut: 'cmd+/',
    keywords: ['keys', 'help'],
    run: (api) => api.openDialog({ type: 'shortcuts' }),
  },

  // AI: the assistant opens (as a preview); the rest is reserved.
  {
    id: 'ask',
    label: 'Ask the assistant…',
    group: 'AI',
    icon: 'codicon:sparkle',
    shortcut: 'ctrl+shift+j',
    macShortcut: 'cmd+j',
    keywords: ['ai', 'assistant', 'chat'],
    run: (api) => api.askAssistant(),
  },
  {
    id: 'describe-command',
    label: 'Describe a command in plain words…',
    group: 'AI',
    icon: 'codicon:wand',
    keywords: ['ai', 'natural language', 'generate', '#'],
    enabled: hasPane,
    run: (api) => {
      if (api.activePaneId !== null) api.setCommandBarPane(api.activePaneId);
    },
  },
  soon('explain-output', 'Explain the last output', 'codicon:comment-discussion', ['why']),
  soon('fix-last', 'Fix the last command', 'codicon:lightbulb-autofix', ['error', 'repair']),
  soon('summarize-session', 'Summarize this session', 'codicon:note', ['recap']),
  soon('generate-script', 'Turn history into a script', 'codicon:file-code', ['automate']),
];

/** The shortcut shown and bound on `platform` (`undefined`: none). */
export function shortcutFor(entry: TerminalCommand, platform: Platform): string | undefined {
  return usesMacKeys(platform) ? (entry.macShortcut ?? entry.shortcut) : entry.shortcut;
}

const CODES: Readonly<Record<string, string>> = {
  '=': 'Equal',
  '-': 'Minus',
  '/': 'Slash',
  ',': 'Comma',
  '.': 'Period',
};

/** `event` presses `shortcut` (also by physical key for `=`, `-`, `/` with Shift held). */
export function pressed(event: KeyboardEvent, shortcut: string, platform: Platform): boolean {
  const parsed = parseHotkey(shortcut, platform);
  if (matchesHotkey(event, parsed)) return true;
  const code = CODES[parsed.key];
  return (
    code !== undefined &&
    event.code === code &&
    event.metaKey === parsed.meta &&
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift
  );
}

/** The command bound to `event` on `platform`, if any (native and reserved ones never are). */
export function commandFor(event: KeyboardEvent, platform: Platform): TerminalCommand | undefined {
  return COMMANDS.find((entry) => {
    if (entry.soon === true || entry.native?.includes(platform) === true) return false;
    const shortcut = shortcutFor(entry, platform);
    return shortcut !== undefined && pressed(event, shortcut, platform);
  });
}

const BY_ID = new Map(COMMANDS.map((entry) => [entry.id, entry]));

/** The command with this id. */
export function command(id: string): TerminalCommand {
  const found = BY_ID.get(id);
  if (found === undefined) throw new Error(`unknown terminal command ${id}`);
  return found;
}

export function isEnabled(entry: TerminalCommand, api: TerminalApi): boolean {
  return entry.enabled?.(api) ?? true;
}

/** Runs `id` when it is enabled; returns whether it ran. */
export function runCommand(id: string, api: TerminalApi): boolean {
  const entry = command(id);
  if (!isEnabled(entry, api)) return false;
  entry.run(api);
  return true;
}
