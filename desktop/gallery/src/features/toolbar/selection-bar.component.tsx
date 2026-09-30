import {
  Badge,
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
} from '@genslate/design-system';

import { COMMANDS, type CommandId, command, isEnabled } from '../../app/commands.registry';
import { useGallery } from '../../app/gallery.context';
import { EMPTY_SELECTION } from '../../model/selection.util';

/** The assistant's photo actions, listed in the ✦ menu as coming soon. */
export const SMART_ACTIONS: readonly CommandId[] = [
  'describe',
  'auto-tag',
  'find-alike',
  'auto-enhance',
  'remove-background',
  'upscale',
];

/** Replaces the collection title while items are selected: what you can do with them. */
export function SelectionBar() {
  const api = useGallery();
  const ids = api.selected.map((item) => item.id);
  const inTrash = api.collection.type === 'trash';
  const allFavorite = api.selected.every((item) => item.favorite);

  const button = (id: CommandId, label?: string) => {
    const entry = command(id);
    return (
      <ToolbarButton
        icon={entry.icon ?? 'codicon:circle'}
        label={label ?? entry.label}
        tooltipShortcut={entry.shortcut}
        disabled={!isEnabled(entry, api)}
        onClick={() => entry.run(api)}
      />
    );
  };

  return (
    <div className="flex min-w-0 items-center gap-1">
      <ToolbarButton
        icon="codicon:close"
        label="Clear the selection"
        tooltipShortcut="escape"
        onClick={() => api.select(EMPTY_SELECTION)}
      />
      <span className="whitespace-nowrap pr-2 font-semibold text-fg-strong text-md tabular-nums">
        {api.selected.length.toLocaleString()} selected
      </span>
      {inTrash ? (
        <ToolbarGroup aria-label="Trash">
          {button('restore')}
          <ToolbarButton
            icon="codicon:clear-all"
            label="Remove from this list"
            onClick={() => api.openDialog({ type: 'forget', ids })}
          />
        </ToolbarGroup>
      ) : (
        <>
          <ToolbarGroup aria-label="Organize">
            <ToolbarButton
              icon={allFavorite ? 'codicon:heart-filled' : 'codicon:heart'}
              label={allFavorite ? 'Remove from favorites' : 'Favorite'}
              tooltipShortcut="f"
              toggled={allFavorite}
              onClick={() => api.favorite(ids, !allFavorite)}
            />
            <AlbumMenu ids={ids} />
            {button('add-tag')}
          </ToolbarGroup>
          <ToolbarSeparator />
          <ToolbarGroup aria-label="Files">
            {button('export')}
            {button('move')}
            {button('compare')}
            {button('trash')}
          </ToolbarGroup>
          <ToolbarSeparator />
          <SmartMenu />
        </>
      )}
    </div>
  );
}

function AlbumMenu({ ids }: { readonly ids: readonly number[] }) {
  const api = useGallery();
  const albums = api.summary?.albums ?? [];
  return (
    <Menu>
      <MenuTrigger render={<ToolbarButton icon="codicon:book" label="Add to album" />} />
      <MenuPopup align="start">
        <MenuItem icon="codicon:add" onClick={() => api.openDialog({ type: 'new-album', ids })}>
          New album…
        </MenuItem>
        {albums.length > 0 ? <MenuSeparator /> : null}
        {albums.length > 0 ? (
          <MenuGroup>
            <MenuGroupLabel>Add to</MenuGroupLabel>
            {albums.map((album) => (
              <MenuItem
                key={album.id}
                icon="codicon:book"
                onClick={() => api.addToAlbum(album.id, ids)}
              >
                {album.name}
              </MenuItem>
            ))}
          </MenuGroup>
        ) : null}
      </MenuPopup>
    </Menu>
  );
}

/** ✦ Smart actions: the assistant's photo actions, reserved. */
function SmartMenu() {
  return (
    <Menu>
      <MenuTrigger
        render={<ToolbarButton icon="codicon:sparkle" label="Smart actions (coming soon)" />}
      />
      <MenuPopup align="start" className="w-64">
        <MenuGroup>
          <MenuGroupLabel className="flex items-center gap-2">
            Smart actions
            <Badge tone="accent" size="sm" pill>
              Coming soon
            </Badge>
          </MenuGroupLabel>
          {COMMANDS.filter((entry) => SMART_ACTIONS.includes(entry.id)).map((entry) => (
            <MenuItem key={entry.id} icon={entry.icon} disabled>
              {entry.label}
            </MenuItem>
          ))}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
