import {
  cn,
  Icon,
  IconButton,
  SidebarContent,
  SidebarItem,
  SidebarSection,
  Tree,
  TreeItem,
} from '@genslate/design-system';
import { useEffect, useEffectEvent, useState } from 'react';

import { useExplorer } from '../../app/explorer.context';
import type { PlaceId, Volume } from '../../ipc/explorer.types';
import { formatBytes } from '../../model/format.util';
import { ancestry, baseName, isInside, samePath } from '../../model/path.util';
import { useDropTarget } from '../files/drag-drop.hook';

const PLACE_ICONS = {
  home: 'codicon:home',
  desktop: 'codicon:window',
  documents: 'codicon:file-text',
  downloads: 'codicon:desktop-download',
  pictures: 'codicon:file-media',
  music: 'codicon:music',
  videos: 'codicon:device-camera-video',
} as const satisfies Record<PlaceId, string>;

/** The Files tab: Favorites, Quick access, Drives and the folder tree. */
export function FilesPanel() {
  const api = useExplorer();
  const { context, favorites } = api;

  return (
    <SidebarContent aria-label="Places">
      <SidebarSection
        title="Favorites"
        actions={
          <IconButton
            size="xs"
            icon="codicon:star-empty"
            label="Add this folder to Favorites"
            onClick={() => {
              if (!favorites.includes(api.tab.path)) api.toggleFavorite(api.tab.path);
            }}
          />
        }
      >
        {favorites.length === 0 ? (
          <p className="mx-4 py-1 text-fg-muted text-sm">
            Right-click a folder and choose Add to Favorites.
          </p>
        ) : (
          favorites.map((path) => (
            <PlaceItem
              key={path}
              path={path}
              label={baseName(path)}
              icon="codicon:star-full"
              favorite
            />
          ))
        )}
      </SidebarSection>
      <SidebarSection title="Quick access">
        {context.places.map((place) => (
          <PlaceItem
            key={place.id}
            path={place.path}
            label={place.label}
            icon={PLACE_ICONS[place.id]}
          />
        ))}
      </SidebarSection>
      <SidebarSection title="Drives">
        {context.volumes.map((volume) => (
          <DriveItem key={volume.path} volume={volume} />
        ))}
      </SidebarSection>
      <SidebarSection title="Folders">
        <FolderTree />
      </SidebarSection>
    </SidebarContent>
  );
}

function PlaceItem({
  path,
  label,
  icon,
  favorite = false,
}: {
  readonly path: string;
  readonly label: string;
  readonly icon: (typeof PLACE_ICONS)[PlaceId] | 'codicon:star-full';
  readonly favorite?: boolean;
}) {
  const api = useExplorer();
  const drop = useDropTarget(path);
  return (
    <SidebarItem
      icon={icon}
      selected={samePath(api.tab.path, path) && api.tab.search === null}
      current="location"
      title={path}
      data-context-zone={favorite ? 'favorite' : 'place'}
      data-path={path}
      onClick={() => api.navigate(path)}
      onAuxClick={(event) => {
        if (event.button === 1) api.newTab(path, false);
      }}
      {...drop.handlers}
      className={cn(drop.over && 'bg-accent-subtle')}
    >
      {label}
    </SidebarItem>
  );
}

function DriveItem({ volume }: { readonly volume: Volume }) {
  const api = useExplorer();
  const drop = useDropTarget(volume.path);
  const used = volume.totalBytes - volume.availableBytes;
  const ratio = volume.totalBytes > 0 ? used / volume.totalBytes : 0;
  const selected = samePath(api.tab.path, volume.path) && api.tab.search === null;
  const nearlyFull = ratio > 0.9;

  return (
    <button
      type="button"
      data-context-zone="place"
      data-path={volume.path}
      aria-current={selected ? 'location' : undefined}
      title={`${volume.path} · ${formatBytes(volume.availableBytes)} free of ${formatBytes(volume.totalBytes)}`}
      onClick={() => api.navigate(volume.path)}
      {...drop.handlers}
      className={cn(
        'group/item mx-2 flex h-11 cursor-interactive items-center gap-2 rounded-control px-2 text-left',
        'focus-ring-inset transition-colors duration-fast ease-standard hover:bg-fill-hover active:bg-fill-pressed',
        'aria-[current]:bg-selection window-inactive:aria-[current]:bg-selection-inactive',
        drop.over && 'bg-accent-subtle',
      )}
    >
      <Icon
        name={volume.removable ? 'codicon:plug' : 'codicon:database'}
        className="text-fg-muted group-aria-[current]/item:text-accent-fg"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-base text-fg group-aria-[current]/item:text-fg-strong">
            {volume.label}
          </span>
          <span className="ml-auto shrink-0 text-2xs text-fg-muted tabular-nums">
            {formatBytes(volume.availableBytes)} free
          </span>
        </span>
        <span aria-hidden className="h-1 overflow-hidden rounded-full bg-track">
          <span
            className={cn('block h-full rounded-full', nearlyFull ? 'bg-warning' : 'bg-accent')}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </span>
      </span>
    </button>
  );
}

/** A lazy folder tree rooted at home and each drive; it follows the active tab. */
function FolderTree() {
  const api = useExplorer();
  const roots = [
    ...(api.context.home === null ? [] : [api.context.home]),
    ...api.context.volumes.map((volume) => volume.path),
  ].filter((path, index, all) => all.findIndex((other) => samePath(other, path)) === index);
  const [expanded, setExpanded] = useState<readonly string[]>([]);

  // Reveal the active folder: expand the folders above it (under the root that holds it).
  const reveal = useEffectEvent((path: string) => {
    const root = roots
      .filter((candidate) => isInside(path, candidate))
      .sort((a, b) => b.length - a.length)[0];
    if (root === undefined) return;
    const above = ancestry(path)
      .map((crumb) => crumb.path)
      .filter((crumb) => isInside(crumb, root) && !samePath(crumb, path));
    for (const folder of above) api.loadFolder(folder);
    setExpanded((current) => [...new Set([...current, ...above])]);
  });
  useEffect(() => reveal(api.tab.path), [api.tab.path]);

  return (
    <Tree
      aria-label="Folders"
      className="px-2"
      selected={api.tab.search === null ? api.tab.path : null}
      onSelect={(id) => api.navigate(id)}
      expanded={expanded}
      onExpandedChange={(ids) => {
        for (const id of ids) if (!expanded.includes(id)) api.loadFolder(id);
        setExpanded(ids);
      }}
    >
      {roots.map((root) => (
        <FolderNode
          key={root}
          path={root}
          label={root === api.context.home ? 'Home' : baseName(root)}
        />
      ))}
    </Tree>
  );
}

function FolderNode({ path, label }: { readonly path: string; readonly label?: string }) {
  const api = useExplorer();
  const drop = useDropTarget(path);
  const listing = api.listingOf(path);
  const folders = listing?.listing?.entries.filter((entry) => entry.isDir) ?? null;

  return (
    <TreeItem
      id={path}
      label={label ?? baseName(path)}
      icon="codicon:folder"
      expandedIcon="codicon:folder-opened"
      title={path}
      data-context-zone="place"
      data-path={path}
      data-drop-over={drop.over ? '' : undefined}
      {...drop.handlers}
      className="data-drop-over:[&>[data-slot=tree-item-row]]:bg-accent-subtle"
    >
      {folders === null ? (
        listing?.status === 'error' ? null : (
          <TreeItem id={`${path}\u0000loading`} label="Loading…" disabled />
        )
      ) : (
        folders.map((entry) => <FolderNode key={entry.path} path={entry.path} />)
      )}
    </TreeItem>
  );
}
