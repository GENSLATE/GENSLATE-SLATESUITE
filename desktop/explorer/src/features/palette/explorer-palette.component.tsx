import { CommandPalette, type CommandPaletteItem } from '@genslate/design-system';

import { COMMANDS, isEnabled } from '../../app/commands.registry';
import { useExplorer } from '../../app/explorer.context';
import { baseName } from '../../model/path.util';

/**
 * Every command, plus the places, favorites and open tabs to jump to. The assistant's commands
 * are listed as coming soon.
 */
export function ExplorerPalette() {
  const api = useExplorer();
  const close = () => api.setPaletteOpen(false);

  const commands: CommandPaletteItem[] = COMMANDS.filter((entry) => entry.id !== 'palette').map(
    (entry) => ({
      id: entry.id,
      label: entry.label,
      group: entry.group === 'AI' ? 'AI (coming soon)' : entry.group,
      icon: entry.icon,
      shortcut: entry.shortcut,
      keywords: entry.keywords,
      detail: entry.soon === true ? 'Coming soon' : undefined,
      disabled: !isEnabled(entry, api),
      onSelect: () => {
        close();
        entry.run(api);
      },
    }),
  );

  const places: CommandPaletteItem[] = [
    ...api.favorites.map((path) => ({
      path,
      label: baseName(path),
      icon: 'codicon:star-full' as const,
    })),
    ...api.context.places.map((place) => ({
      path: place.path,
      label: place.label,
      icon: 'codicon:folder' as const,
    })),
    ...api.context.volumes.map((volume) => ({
      path: volume.path,
      label: volume.label,
      icon: 'codicon:database' as const,
    })),
  ]
    .filter((item, index, all) => all.findIndex((other) => other.path === item.path) === index)
    .map((item) => ({
      id: `go:${item.path}`,
      label: `Go to ${item.label}`,
      group: 'Places',
      icon: item.icon,
      detail: item.path,
      keywords: ['open', 'folder'],
      onSelect: () => {
        close();
        api.navigate(item.path);
      },
    }));

  const tabs: CommandPaletteItem[] = api.tabs.tabs
    .filter((tab) => tab.id !== api.tabs.activeId)
    .map((tab) => ({
      id: `tab:${tab.id}`,
      label: `Switch to ${baseName(tab.path)}`,
      group: 'Open tabs',
      icon: 'codicon:folder-opened',
      detail: tab.path,
      onSelect: () => {
        close();
        api.dispatch({ type: 'activate', id: tab.id });
      },
    }));

  return (
    <CommandPalette
      open={api.paletteOpen}
      onOpenChange={api.setPaletteOpen}
      items={[...commands, ...tabs, ...places]}
      placeholder="Type a command or a place…"
    />
  );
}
