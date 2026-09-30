import {
  ContextMenuCheckboxItem,
  ContextMenuGroup,
  ContextMenuGroupLabel,
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

import { COMMANDS, type CommandId, command, isEnabled } from '../../app/commands.registry';
import type { GalleryApi } from '../../app/gallery.context';
import type { MediaItem, SortKey, ViewMode } from '../../ipc/gallery.types';
import { SMART_ACTIONS } from '../toolbar/selection-bar.component';

const REVEAL_LABELS: Readonly<Record<Platform, string>> = {
  macos: 'Show in Finder',
  windows: 'Show in File Explorer',
  linux: 'Show in file manager',
  web: 'Show in file manager',
};

const VIEW_LABELS: Readonly<Record<ViewMode, string>> = {
  timeline: 'Timeline',
  grid: 'Grid',
  details: 'Details',
};

const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  taken: 'Date taken',
  added: 'Date added',
  name: 'Name',
  size: 'Size',
};

/** Gallery's rows for a right-click, by area (`data-context-zone`). */
export function galleryMenuItems(target: WindowContextTarget, api: GalleryApi, platform: Platform) {
  if (target.kind !== 'content') return null;
  const element = target.element;
  switch (target.zone) {
    case 'media': {
      const id = Number(element.closest('[data-id]')?.getAttribute('data-id'));
      if (!Number.isInteger(id)) return null;
      // The menu acts on the selection when the item is part of it, else on the item alone.
      const ids = api.selection.selected.includes(id) ? api.selection.selected : [id];
      const items = ids.map((each) => api.itemById(each)).filter((item) => item !== undefined);
      return <MediaItems api={api} items={items} platform={platform} />;
    }
    case 'viewer': {
      if (api.mode.type !== 'view') return null;
      const item = api.itemById(api.mode.id);
      return item === undefined ? null : (
        <MediaItems api={api} items={[item]} platform={platform} inViewer />
      );
    }
    case 'view':
      return <ViewItems api={api} />;
    case 'album': {
      const id = Number(element.closest('[data-album-id]')?.getAttribute('data-album-id'));
      const album = api.summary?.albums.find((entry) => entry.id === id);
      if (album === undefined) return null;
      return (
        <>
          <ContextMenuItem
            icon="codicon:book"
            onClick={() => api.setCollection({ type: 'album', id: album.id })}
          >
            Open
          </ContextMenuItem>
          <ContextMenuItem
            icon="codicon:symbol-string"
            onClick={() => api.openDialog({ type: 'rename-album', id: album.id, name: album.name })}
          >
            Rename…
          </ContextMenuItem>
          <ContextMenuItem
            icon="codicon:trash"
            tone="danger"
            onClick={() => api.openDialog({ type: 'delete-album', id: album.id, name: album.name })}
          >
            Delete album…
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      );
    }
    case 'root':
    case 'folder': {
      const path = element.closest('[data-path]')?.getAttribute('data-path');
      if (path == null) return null;
      return (
        <>
          <ContextMenuItem
            icon="codicon:folder-opened"
            onClick={() => {
              api.setMode({ type: 'browse' });
              api.setCollection({ type: 'folder', path });
            }}
          >
            Open
          </ContextMenuItem>
          <ContextMenuItem icon="codicon:copy" onClick={() => api.copyText(path, 'the path')}>
            Copy path
          </ContextMenuItem>
          {target.zone === 'root' ? (
            <>
              <ContextMenuSeparator />
              <CommandItem id="rescan" api={api} />
              <ContextMenuItem
                icon="codicon:close"
                tone="danger"
                onClick={() => api.openDialog({ type: 'remove-folder', path })}
              >
                Remove from the library…
              </ContextMenuItem>
            </>
          ) : null}
          <ContextMenuSeparator />
        </>
      );
    }
    default:
      return null;
  }
}

function CommandItem({
  id,
  api,
  label,
}: {
  readonly id: CommandId;
  readonly api: GalleryApi;
  readonly label?: string;
}) {
  const entry = command(id);
  return (
    <ContextMenuItem
      icon={entry.icon}
      shortcut={entry.shortcut}
      disabled={!isEnabled(entry, api)}
      onClick={() => entry.run(api)}
    >
      {label ?? entry.label}
    </ContextMenuItem>
  );
}

/** Reserved for the assistant: shown so people discover it, disabled until it ships. */
function SmartSubmenu() {
  return (
    <ContextMenuSubmenuRoot>
      <ContextMenuSubmenuTrigger icon="codicon:sparkle">Smart actions</ContextMenuSubmenuTrigger>
      <MenuPopup>
        <ContextMenuGroup>
          <ContextMenuGroupLabel>Coming soon</ContextMenuGroupLabel>
          {COMMANDS.filter((entry) => SMART_ACTIONS.includes(entry.id)).map((entry) => (
            <ContextMenuItem key={entry.id} icon={entry.icon} disabled>
              {entry.label}
            </ContextMenuItem>
          ))}
        </ContextMenuGroup>
      </MenuPopup>
    </ContextMenuSubmenuRoot>
  );
}

interface MediaItemsProps {
  readonly api: GalleryApi;
  readonly items: readonly MediaItem[];
  readonly platform: Platform;
  readonly inViewer?: boolean;
}

function MediaItems({ api, items, platform, inViewer = false }: MediaItemsProps) {
  const [first] = items;
  if (first === undefined) return null;
  const ids = items.map((item) => item.id);
  const single = items.length === 1;
  const trashed = items.every((item) => item.trashed);
  const allFavorite = items.every((item) => item.favorite);
  const albums = api.summary?.albums ?? [];
  const { collection } = api;

  if (trashed) {
    return (
      <>
        <ContextMenuItem
          icon="codicon:discard"
          disabled={!api.context.canRestore}
          onClick={() => api.restore(ids)}
        >
          Put back
        </ContextMenuItem>
        <ContextMenuItem
          icon="codicon:clear-all"
          tone="danger"
          onClick={() => api.openDialog({ type: 'forget', ids })}
        >
          Remove from this list…
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          icon="codicon:copy"
          onClick={() =>
            api.copyText(
              items.map((item) => item.path).join('\n'),
              single ? 'the path' : 'the paths',
            )
          }
        >
          {single ? 'Copy path' : 'Copy paths'}
        </ContextMenuItem>
        <ContextMenuSeparator />
      </>
    );
  }

  return (
    <>
      {inViewer ? null : (
        <ContextMenuItem
          icon="codicon:eye"
          shortcut="enter"
          onClick={() => api.openViewer(first.id)}
        >
          Open in the viewer
        </ContextMenuItem>
      )}
      <ContextMenuItem
        icon="codicon:edit"
        shortcut="e"
        disabled={!single || first.kind !== 'image' || !first.thumbnail}
        onClick={() => api.setMode({ type: 'edit', id: first.id })}
      >
        Edit a copy
      </ContextMenuItem>
      {items.length === 2 && !inViewer ? (
        <ContextMenuItem
          icon="codicon:split-horizontal"
          shortcut="c"
          onClick={() => {
            const [a, b] = ids;
            if (a !== undefined && b !== undefined) api.setMode({ type: 'compare', ids: [a, b] });
          }}
        >
          Compare side by side
        </ContextMenuItem>
      ) : null}
      <ContextMenuSeparator />
      <ContextMenuItem
        icon={allFavorite ? 'codicon:heart-filled' : 'codicon:heart'}
        shortcut="f"
        onClick={() => api.favorite(ids, !allFavorite)}
      >
        {allFavorite ? 'Remove from favorites' : 'Favorite'}
      </ContextMenuItem>
      <ContextMenuSubmenuRoot>
        <ContextMenuSubmenuTrigger icon="codicon:star-empty">Rating</ContextMenuSubmenuTrigger>
        <MenuPopup>
          <ContextMenuRadioGroup
            value={single ? String(first.rating) : null}
            onValueChange={(value: string) => api.rate(ids, Number(value))}
          >
            {[5, 4, 3, 2, 1, 0].map((stars) => (
              <ContextMenuRadioItem key={stars} value={String(stars)} shortcut={String(stars)}>
                {stars === 0 ? 'No rating' : '★'.repeat(stars)}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </MenuPopup>
      </ContextMenuSubmenuRoot>
      <ContextMenuSubmenuRoot>
        <ContextMenuSubmenuTrigger icon="codicon:book">Add to album</ContextMenuSubmenuTrigger>
        <MenuPopup>
          {albums.map((album) => (
            <ContextMenuItem key={album.id} onClick={() => api.addToAlbum(album.id, ids)}>
              {album.name}
            </ContextMenuItem>
          ))}
          {albums.length === 0 ? null : <ContextMenuSeparator />}
          <ContextMenuItem
            icon="codicon:add"
            onClick={() => api.openDialog({ type: 'new-album', ids })}
          >
            New album…
          </ContextMenuItem>
        </MenuPopup>
      </ContextMenuSubmenuRoot>
      {collection.type === 'album' ? (
        <ContextMenuItem
          icon="codicon:remove"
          onClick={() => api.removeFromAlbum(collection.id, ids)}
        >
          Remove from this album
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem
        icon="codicon:tag"
        shortcut="t"
        onClick={() => api.openDialog({ type: 'add-tag', ids })}
      >
        Add a tag…
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        icon="codicon:symbol-string"
        shortcut="F2"
        disabled={!single}
        onClick={() => api.openDialog({ type: 'rename', id: first.id, name: first.name })}
      >
        Rename…
      </ContextMenuItem>
      <ContextMenuItem icon="codicon:folder-opened" onClick={() => api.move(ids)}>
        Move to folder…
      </ContextMenuItem>
      <ContextMenuItem icon="codicon:files" onClick={() => api.copy(ids)}>
        Copy to folder…
      </ContextMenuItem>
      <ContextMenuItem
        icon="codicon:export"
        shortcut="mod+shift+e"
        onClick={() => api.openDialog({ type: 'export', ids })}
      >
        Export…
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        icon="codicon:link-external"
        disabled={!single}
        onClick={() => api.open(first.id)}
      >
        Open in the default app
      </ContextMenuItem>
      <ContextMenuItem
        icon="codicon:folder"
        disabled={!single}
        onClick={() => api.reveal(first.id)}
      >
        {REVEAL_LABELS[platform]}
      </ContextMenuItem>
      <ContextMenuItem
        icon="codicon:copy"
        onClick={() =>
          api.copyText(items.map((item) => item.path).join('\n'), single ? 'the path' : 'the paths')
        }
      >
        {single ? 'Copy path' : 'Copy paths'}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <SmartSubmenu />
      <ContextMenuSeparator />
      <ContextMenuItem icon="codicon:trash" shortcut="delete" onClick={() => api.trash(ids)}>
        Move to Trash
      </ContextMenuItem>
      <ContextMenuSeparator />
    </>
  );
}

function ViewItems({ api }: { readonly api: GalleryApi }) {
  const { settings } = api;
  return (
    <>
      <CommandItem id="select-all" api={api} />
      <CommandItem id="slideshow" api={api} />
      <ContextMenuSeparator />
      <ContextMenuSubmenuRoot>
        <ContextMenuSubmenuTrigger icon="codicon:layout">View</ContextMenuSubmenuTrigger>
        <MenuPopup>
          <ContextMenuRadioGroup
            value={settings.view}
            onValueChange={(value: ViewMode) => command(`view-${value}`).run(api)}
          >
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((view) => (
              <ContextMenuRadioItem
                key={view}
                value={view}
                shortcut={command(`view-${view}`).shortcut}
              >
                {VIEW_LABELS[view]}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem
            checked={settings.showVideos}
            onCheckedChange={(checked) => api.updateSetting('showVideos', checked)}
          >
            Show videos
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem
            checked={api.infoOpen}
            shortcut="mod+i"
            onCheckedChange={() => api.toggleInfo()}
          >
            Info panel
          </ContextMenuCheckboxItem>
        </MenuPopup>
      </ContextMenuSubmenuRoot>
      <ContextMenuSubmenuRoot>
        <ContextMenuSubmenuTrigger icon="codicon:list-ordered">Sort by</ContextMenuSubmenuTrigger>
        <MenuPopup>
          <ContextMenuRadioGroup
            value={settings.sortBy}
            onValueChange={(value: SortKey) => api.updateSetting('sortBy', value)}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <ContextMenuRadioItem key={key} value={key}>
                {SORT_LABELS[key]}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem
            checked={settings.sortDescending}
            onCheckedChange={(checked) => api.updateSetting('sortDescending', checked)}
          >
            Newest first
          </ContextMenuCheckboxItem>
        </MenuPopup>
      </ContextMenuSubmenuRoot>
      <ContextMenuSeparator />
      <CommandItem id="add-folder" api={api} />
      <CommandItem id="rescan" api={api} />
      <CommandItem id="duplicates" api={api} />
      <CommandItem
        id="undo"
        api={api}
        label={api.undoLabel === null ? 'Undo' : `Undo ${api.undoLabel}`}
      />
      <ContextMenuSeparator />
    </>
  );
}
