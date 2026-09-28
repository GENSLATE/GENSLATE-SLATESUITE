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
import type { ExplorerApi, NewItemKind } from '../../app/explorer.context';
import type { Entry, SortKey, ViewMode } from '../../ipc/explorer.types';
import { baseName, parentOf } from '../../model/path.util';

const REVEAL_LABELS: Readonly<Record<Platform, string>> = {
  macos: 'Show in Finder',
  windows: 'Show in File Explorer',
  linux: 'Show in file manager',
  web: 'Show in file manager',
};

/** The explorer's rows for a right-click, by area (`data-context-zone`). */
export function explorerMenuItems(
  target: WindowContextTarget,
  api: ExplorerApi,
  platform: Platform,
) {
  if (target.kind !== 'content') return null;
  const element = target.element;
  switch (target.zone) {
    case 'file': {
      const path = element.closest('[data-path]')?.getAttribute('data-path');
      if (path == null) return null;
      const paths = api.tab.selection.selected.includes(path) ? api.tab.selection.selected : [path];
      const entries = api.visible.filter((entry) => paths.includes(entry.path));
      return <FileItems api={api} entries={entries} platform={platform} />;
    }
    case 'files':
      return <FolderItems api={api} platform={platform} />;
    case 'tab': {
      const id = element.closest('[data-tab-id]')?.getAttribute('data-tab-id');
      const tab = api.tabs.tabs.find((candidate) => candidate.id === id);
      if (tab === undefined) return null;
      return (
        <>
          <ContextMenuItem icon="codicon:add" shortcut="mod+t" onClick={() => api.newTab(tab.path)}>
            Duplicate tab
          </ContextMenuItem>
          <ContextMenuItem
            icon="codicon:close"
            disabled={api.tabs.tabs.length <= 1}
            onClick={() => api.dispatch({ type: 'close-tab', id: tab.id })}
          >
            Close tab
          </ContextMenuItem>
          <ContextMenuItem
            icon="codicon:close-all"
            disabled={api.tabs.tabs.length <= 1}
            onClick={() => api.dispatch({ type: 'close-other-tabs', id: tab.id })}
          >
            Close other tabs
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem icon="codicon:copy" onClick={() => api.copyText(tab.path, 'the path')}>
            Copy path
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      );
    }
    case 'place':
    case 'favorite': {
      const path = element.closest('[data-path]')?.getAttribute('data-path');
      if (path == null) return null;
      const favorite = api.favorites.includes(path);
      return (
        <>
          <ContextMenuItem icon="codicon:folder-opened" onClick={() => api.navigate(path)}>
            Open
          </ContextMenuItem>
          <ContextMenuItem icon="codicon:add" onClick={() => api.newTab(path)}>
            Open in new tab
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            icon={favorite ? 'codicon:star-full' : 'codicon:star-empty'}
            onClick={() => api.toggleFavorite(path)}
          >
            {favorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </ContextMenuItem>
          <ContextMenuItem
            icon="codicon:output"
            disabled={api.clipboard === null}
            onClick={() => api.paste(path)}
          >
            Paste into “{baseName(path)}”
          </ContextMenuItem>
          <ContextMenuItem icon="codicon:copy" onClick={() => api.copyText(path, 'the path')}>
            Copy path
          </ContextMenuItem>
          <ContextMenuItem icon="codicon:folder-opened" onClick={() => api.reveal(path)}>
            {REVEAL_LABELS[platform]}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            icon="codicon:info"
            shortcut="alt+enter"
            onClick={() => api.openDialog({ type: 'properties', path })}
          >
            Properties
          </ContextMenuItem>
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
  readonly api: ExplorerApi;
  readonly label?: string;
}) {
  const entry = command(id);
  return (
    <ContextMenuItem
      icon={entry.icon}
      shortcut={entry.shortcut}
      disabled={!isEnabled(entry, api)}
      tone={id === 'delete-permanently' ? 'danger' : 'default'}
      onClick={() => entry.run(api)}
    >
      {label ?? entry.label}
    </ContextMenuItem>
  );
}

/** Reserved for the assistant: shown so people discover it, disabled until it ships. */
function SmartSubmenu({ ids }: { readonly ids: readonly CommandId[] }) {
  return (
    <ContextMenuSubmenuRoot>
      <ContextMenuSubmenuTrigger icon="codicon:sparkle">Smart actions</ContextMenuSubmenuTrigger>
      <MenuPopup>
        <ContextMenuGroup>
          <ContextMenuGroupLabel>Coming soon</ContextMenuGroupLabel>
          {COMMANDS.filter((entry) => ids.includes(entry.id)).map((entry) => (
            <ContextMenuItem key={entry.id} icon={entry.icon} disabled>
              {entry.label}
            </ContextMenuItem>
          ))}
        </ContextMenuGroup>
      </MenuPopup>
    </ContextMenuSubmenuRoot>
  );
}

function FileItems({
  api,
  entries,
  platform,
}: {
  readonly api: ExplorerApi;
  readonly entries: readonly Entry[];
  readonly platform: Platform;
}) {
  const [first] = entries;
  if (first === undefined) return null;
  const single = entries.length === 1;
  const folder = single && first.isDir;
  const paths = entries.map((entry) => entry.path);
  const inSearch = api.tab.search !== null;

  return (
    <>
      <ContextMenuItem
        icon={first.isDir ? 'codicon:folder-opened' : 'codicon:link-external'}
        shortcut="enter"
        onClick={() => {
          for (const entry of entries) if (!entry.isDir) api.open(entry);
          if (entries.every((entry) => entry.isDir)) api.open(first);
        }}
      >
        Open
      </ContextMenuItem>
      {entries.some((entry) => entry.isDir) ? (
        <ContextMenuItem
          icon="codicon:add"
          onClick={() => {
            for (const entry of entries) if (entry.isDir) api.newTab(entry.path, false);
          }}
        >
          Open in new tab
        </ContextMenuItem>
      ) : null}
      {single && !first.isDir && api.context.canOpenWith ? (
        <ContextMenuItem icon="codicon:link-external" onClick={() => api.openWith(first)}>
          Open with…
        </ContextMenuItem>
      ) : null}
      {inSearch ? (
        <ContextMenuItem
          icon="codicon:folder"
          onClick={() => {
            const parent = parentOf(first.path);
            if (parent !== null) api.navigate(parent, [first.path]);
          }}
        >
          Open containing folder
        </ContextMenuItem>
      ) : null}
      <ContextMenuSeparator />
      <CommandItem id="cut" api={api} />
      <CommandItem id="copy" api={api} />
      {folder ? (
        <ContextMenuItem
          icon="codicon:output"
          disabled={api.clipboard === null}
          onClick={() => api.paste(first.path)}
        >
          Paste into “{first.name}”
        </ContextMenuItem>
      ) : null}
      <CommandItem id="duplicate" api={api} />
      <ContextMenuSeparator />
      <CommandItem id="rename" api={api} />
      <CommandItem id="trash" api={api} />
      <CommandItem id="delete-permanently" api={api} />
      <ContextMenuSeparator />
      <ContextMenuItem
        icon="codicon:copy"
        shortcut="mod+shift+c"
        onClick={() => api.copyText(paths.join('\n'), single ? 'the path' : 'the paths')}
      >
        {single ? 'Copy path' : 'Copy paths'}
      </ContextMenuItem>
      <ContextMenuItem
        icon="codicon:symbol-string"
        onClick={() =>
          api.copyText(
            entries.map((entry) => entry.name).join('\n'),
            single ? 'the name' : 'the names',
          )
        }
      >
        {single ? 'Copy name' : 'Copy names'}
      </ContextMenuItem>
      {folder ? (
        <ContextMenuItem
          icon={api.favorites.includes(first.path) ? 'codicon:star-full' : 'codicon:star-empty'}
          onClick={() => api.toggleFavorite(first.path)}
        >
          {api.favorites.includes(first.path) ? 'Remove from Favorites' : 'Add to Favorites'}
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem icon="codicon:folder-opened" onClick={() => api.reveal(first.path)}>
        {REVEAL_LABELS[platform]}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <SmartSubmenu ids={['summarize', 'find-similar', 'smart-rename']} />
      <ContextMenuSeparator />
      <ContextMenuItem
        icon="codicon:info"
        shortcut="alt+enter"
        onClick={() => api.openDialog({ type: 'properties', path: first.path })}
      >
        Properties
      </ContextMenuItem>
      <ContextMenuSeparator />
    </>
  );
}

const NEW_ITEMS: readonly { kind: NewItemKind; id: CommandId; label: string }[] = [
  { kind: 'folder', id: 'new-folder', label: 'Folder' },
  { kind: 'text', id: 'new-text-file', label: 'Text file' },
  { kind: 'markdown', id: 'new-note', label: 'Markdown note' },
];

const VIEW_LABELS: Readonly<Record<ViewMode, string>> = {
  details: 'Details',
  icons: 'Icons',
  tiles: 'Tiles',
};
const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  name: 'Name',
  modified: 'Date modified',
  kind: 'Kind',
  size: 'Size',
};

function FolderItems({
  api,
  platform,
}: {
  readonly api: ExplorerApi;
  readonly platform: Platform;
}) {
  const { tab } = api;
  const inFolder = tab.search === null;

  return (
    <>
      {inFolder ? (
        <ContextMenuSubmenuRoot>
          <ContextMenuSubmenuTrigger icon="codicon:add">New</ContextMenuSubmenuTrigger>
          <MenuPopup>
            {NEW_ITEMS.map((item) => {
              const entry = command(item.id);
              return (
                <ContextMenuItem
                  key={item.kind}
                  icon={entry.icon}
                  shortcut={entry.shortcut}
                  onClick={() => api.createItem(item.kind)}
                >
                  {item.label}
                </ContextMenuItem>
              );
            })}
          </MenuPopup>
        </ContextMenuSubmenuRoot>
      ) : null}
      <CommandItem id="paste" api={api} />
      <CommandItem
        id="undo"
        api={api}
        label={api.undoLabel === null ? 'Undo' : `Undo ${api.undoLabel}`}
      />
      <ContextMenuSeparator />
      <ContextMenuSubmenuRoot>
        <ContextMenuSubmenuTrigger icon="codicon:layout">View</ContextMenuSubmenuTrigger>
        <MenuPopup>
          <ContextMenuRadioGroup
            value={tab.view}
            onValueChange={(value: ViewMode) => {
              const id = `view-${value}` as const;
              command(id).run(api);
            }}
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
            checked={api.settings.showHidden}
            shortcut="mod+h"
            onCheckedChange={(checked) => api.updateSetting('showHidden', checked)}
          >
            Hidden items
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem
            checked={api.previewOpen}
            shortcut="alt+p"
            onCheckedChange={() => api.togglePreview()}
          >
            Preview pane
          </ContextMenuCheckboxItem>
        </MenuPopup>
      </ContextMenuSubmenuRoot>
      {inFolder ? (
        <ContextMenuSubmenuRoot>
          <ContextMenuSubmenuTrigger icon="codicon:list-ordered">Sort by</ContextMenuSubmenuTrigger>
          <MenuPopup>
            <ContextMenuRadioGroup
              value={tab.sortBy}
              onValueChange={(value: SortKey) =>
                api.dispatch({ type: 'sort', sortBy: value, sortDescending: tab.sortDescending })
              }
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <ContextMenuRadioItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem
              checked={tab.sortDescending}
              onCheckedChange={(checked) =>
                api.dispatch({ type: 'sort', sortBy: tab.sortBy, sortDescending: checked })
              }
            >
              Descending
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem
              checked={api.settings.foldersFirst}
              onCheckedChange={(checked) => api.updateSetting('foldersFirst', checked)}
            >
              Folders first
            </ContextMenuCheckboxItem>
          </MenuPopup>
        </ContextMenuSubmenuRoot>
      ) : null}
      <CommandItem id="select-all" api={api} />
      <CommandItem id="refresh" api={api} />
      <ContextMenuSeparator />
      <ContextMenuItem
        icon={api.favorites.includes(tab.path) ? 'codicon:star-full' : 'codicon:star-empty'}
        onClick={() => api.toggleFavorite(tab.path)}
      >
        {api.favorites.includes(tab.path) ? 'Remove from Favorites' : 'Add to Favorites'}
      </ContextMenuItem>
      <ContextMenuItem icon="codicon:copy" onClick={() => api.copyText(tab.path, 'the path')}>
        Copy folder path
      </ContextMenuItem>
      <ContextMenuItem icon="codicon:folder-opened" onClick={() => api.reveal(tab.path)}>
        {REVEAL_LABELS[platform]}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <SmartSubmenu ids={['organize', 'summarize']} />
      <ContextMenuItem
        icon="codicon:info"
        shortcut="alt+enter"
        onClick={() => api.openDialog({ type: 'properties', path: tab.path })}
      >
        Properties
      </ContextMenuItem>
      <ContextMenuSeparator />
    </>
  );
}
