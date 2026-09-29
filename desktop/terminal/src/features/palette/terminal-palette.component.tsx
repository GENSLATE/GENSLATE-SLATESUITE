import { CommandPalette, type CommandPaletteItem, usePlatform } from '@genslate/design-system';

import { COMMANDS, isEnabled, shortcutFor } from '../../app/commands.registry';
import { useTerminal } from '../../app/terminal.context';
import { profileIcon } from '../tabs/profile-visual.util';
import { tabTitle } from '../tabs/tab-title.util';

/**
 * Every command, plus the shells to open, the open tabs to jump to and the snippets to run.
 * The assistant's commands are listed as coming soon.
 */
export function TerminalPalette() {
  const api = useTerminal();
  const platform = usePlatform();
  const close = () => api.setPaletteOpen(false);
  const then = (action: () => void) => () => {
    close();
    action();
  };

  const commands: CommandPaletteItem[] = COMMANDS.filter(
    (entry) => entry.id !== 'palette' && entry.hidden !== true,
  ).map((entry) => ({
    id: entry.id,
    label: entry.label,
    group: entry.group === 'AI' ? 'AI (coming soon)' : entry.group,
    icon: entry.icon,
    shortcut: shortcutFor(entry, platform),
    keywords: entry.keywords,
    detail: entry.soon === true ? 'Coming soon' : undefined,
    disabled: !isEnabled(entry, api),
    onSelect: then(() => entry.run(api)),
  }));

  const shells: CommandPaletteItem[] = api.profiles.flatMap((profile) => [
    {
      id: `open:${profile.id}`,
      label: `New tab: ${profile.name}`,
      group: 'Shells',
      icon: profileIcon(profile.icon),
      detail: [profile.command, ...profile.args].join(' '),
      keywords: ['profile', 'shell', 'open', profile.kind],
      onSelect: then(() => api.newTab({ profileId: profile.id })),
    },
    {
      id: `split:${profile.id}`,
      label: `Split with ${profile.name}`,
      group: 'Shells',
      icon: 'codicon:split-horizontal' as const,
      keywords: ['pane', profile.kind],
      disabled: api.activePaneId === null,
      onSelect: then(() => api.split('row', { profileId: profile.id })),
    },
  ]);

  const tabs: CommandPaletteItem[] = api.layout.tabs
    .filter((tab) => tab.id !== api.layout.activeTabId)
    .map((tab) => {
      const pane = api.store.get(tab.activePaneId);
      const profile = api.profile(pane?.profileId ?? api.defaultProfileId);
      return {
        id: `tab:${tab.id}`,
        label: `Switch to ${tabTitle(tab, pane, profile)}`,
        group: 'Open tabs',
        icon: profileIcon(profile.icon),
        detail: pane?.cwd ?? undefined,
        onSelect: then(() => api.dispatch({ type: 'activate-tab', id: tab.id })),
      };
    });

  const snippets: CommandPaletteItem[] = api.snippets.map((snippet) => ({
    id: `snippet:${snippet.id}`,
    label: `${snippet.run ? 'Run' : 'Type'} ${snippet.name}`,
    group: 'Snippets',
    icon: snippet.run ? ('codicon:play' as const) : ('codicon:symbol-snippet' as const),
    detail: snippet.command,
    keywords: ['snippet', snippet.description],
    disabled: api.activePaneId === null,
    onSelect: then(() => api.sendText(snippet.command, { run: snippet.run })),
  }));

  return (
    <CommandPalette
      open={api.paletteOpen}
      onOpenChange={api.setPaletteOpen}
      items={[...commands, ...shells, ...tabs, ...snippets]}
      placeholder="Type a command, a shell or a snippet…"
    />
  );
}
