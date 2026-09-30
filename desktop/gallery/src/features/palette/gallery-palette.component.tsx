import { CommandPalette, type CommandPaletteItem } from '@genslate/design-system';

import { COMMANDS, isEnabled } from '../../app/commands.registry';
import { useGallery } from '../../app/gallery.context';
import type { Collection } from '../../ipc/gallery.types';
import { countryName } from '../../model/format.util';

/**
 * Every command, plus the albums, tags and places to jump to. The assistant's commands are
 * listed as coming soon.
 */
export function GalleryPalette() {
  const api = useGallery();
  const close = () => api.setPaletteOpen(false);
  const go = (collection: Collection) => {
    close();
    api.setMode({ type: 'browse' });
    api.setCollection(collection);
  };

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

  const summary = api.summary;
  const albums: CommandPaletteItem[] = (summary?.albums ?? []).map((album) => ({
    id: `album:${album.id}`,
    label: `Go to ${album.name}`,
    group: 'Albums',
    icon: 'codicon:book',
    detail: `${album.count.toLocaleString()} items`,
    keywords: ['album'],
    onSelect: () => go({ type: 'album', id: album.id }),
  }));
  const tags: CommandPaletteItem[] = (summary?.tags ?? []).map((tag) => ({
    id: `tag:${tag.name}`,
    label: `Go to #${tag.name}`,
    group: 'Tags',
    icon: 'codicon:tag',
    detail: `${tag.count.toLocaleString()} items`,
    keywords: ['tag'],
    onSelect: () => go({ type: 'tag', name: tag.name }),
  }));
  const places: CommandPaletteItem[] = (summary?.places ?? []).map((place) => ({
    id: `place:${place.country}:${place.city}`,
    label: `Go to ${place.city}`,
    group: 'Places',
    icon: 'codicon:location',
    detail: countryName(place.country),
    keywords: ['place', 'trip', countryName(place.country)],
    onSelect: () => go({ type: 'place', country: place.country, city: place.city }),
  }));

  return (
    <CommandPalette
      open={api.paletteOpen}
      onOpenChange={api.setPaletteOpen}
      items={[...commands, ...albums, ...places, ...tags]}
      placeholder="Type a command, an album or a place…"
    />
  );
}
