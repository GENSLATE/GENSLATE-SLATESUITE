import {
  Badge,
  cn,
  EmptyState,
  IconButton,
  SidebarContent,
  SidebarHeader,
  Tree,
  TreeItem,
} from '@genslate/design-system';
import { type ReactNode, useEffect, useEffectEvent, useState } from 'react';

import { errorMessage } from '../../app/error-message.util';
import { useTerminal } from '../../app/terminal.context';
import { usePaneState } from '../../engine/pane-store';
import type { FileNode, GitInfo } from '../../ipc/terminal.types';
import { fileIcon, GIT_LETTER, GIT_TONE } from '../../model/file-icon.util';
import { anyInside, baseName, isInside, parentOf, samePath, tildify } from '../../model/path.util';

type Listing =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly entries: readonly FileNode[] }
  | { readonly status: 'error'; readonly message: string };

/**
 * The Files tab: the active pane's folder as a tree that follows `cd` (or stays pinned), with
 * git status. Double-click a folder to `cd` into it and a file to open it; right-click for
 * Insert path, Copy path, Open in a new tab and more.
 */
export function FilesPanel() {
  const api = useTerminal();
  const pane = usePaneState(api.store, api.activePaneId ?? '');
  const liveCwd = pane?.cwd ?? api.context.home;
  const [pinned, setPinned] = useState<string | null>(null);
  const root = pinned ?? liveCwd;
  const [showHidden, setShowHidden] = useState(false);
  const [listings, setListings] = useState<ReadonlyMap<string, Listing>>(new Map());
  const [expanded, setExpanded] = useState<readonly string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [git, setGit] = useState<GitInfo | null>(null);

  const load = (path: string, hidden = showHidden) => {
    setListings((current) =>
      current.get(path)?.status === 'ready'
        ? current
        : new Map(current).set(path, { status: 'loading' }),
    );
    api.backend.listDir(path, hidden).then(
      (listing) =>
        setListings((current) =>
          new Map(current).set(path, { status: 'ready', entries: listing.entries }),
        ),
      (error: unknown) =>
        setListings((current) =>
          new Map(current).set(path, { status: 'error', message: errorMessage(error) }),
        ),
    );
  };

  // A new root (the pane changed folder) or the hidden-files switch: list again.
  const resetTo = (path: string, hidden: boolean) => {
    setListings(new Map());
    setExpanded((current) => current.filter((folder) => isInside(folder, path)));
    load(path, hidden);
    api.backend.gitInfo(path).then(setGit, () => setGit(null));
  };
  const reload = useEffectEvent(resetTo);
  useEffect(() => {
    if (root !== null) reload(root, showHidden);
  }, [root, showHidden]);

  // Watch what is on screen; refresh the folders that change.
  const watched = root === null ? [] : [root, ...expanded];
  const watchKey = watched.join('\n');
  const watch = useEffectEvent((key: string) => {
    api.backend.watchDirs(key === '' ? [] : key.split('\n')).catch((error: unknown) => {
      console.warn('terminal: could not watch folders', error);
    });
  });
  useEffect(() => watch(watchKey), [watchKey]);

  const refresh = useEffectEvent((folders: readonly string[]) => {
    for (const path of listings.keys()) {
      if (folders.some((folder) => samePath(folder, path))) {
        setListings((current) => {
          const next = new Map(current);
          next.delete(path);
          return next;
        });
        load(path);
      }
    }
    // Git status is only worth asking again when the change is in the repository.
    const scope = git?.root ?? root;
    if (root !== null && scope !== null && anyInside(folders, scope)) {
      api.backend.gitInfo(root).then(setGit, () => setGit(null));
    }
  });
  const changed = api.changedFolders;
  useEffect(() => refresh(changed.folders), [changed]);

  if (root === null) {
    return (
      <EmptyState
        size="sm"
        icon="codicon:folder"
        title="No folder yet"
        description="The shell hasn’t said where it is."
      />
    );
  }

  const parent = parentOf(root);
  const nodeOf = (path: string): FileNode | undefined => {
    for (const listing of listings.values()) {
      if (listing.status !== 'ready') continue;
      const found = listing.entries.find((entry) => entry.path === path);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SidebarHeader
        title={
          <span className="flex min-w-0 items-center gap-1.5" title={root}>
            <span className="truncate">{baseName(root) || root}</span>
            {git?.branch == null ? null : (
              <Badge size="sm" icon="codicon:git-branch-compact" className="shrink-0 normal-case">
                {git.branch}
                {git.changes > 0 ? ` · ${git.changes}` : ''}
              </Badge>
            )}
          </span>
        }
        actions={
          <>
            <IconButton
              size="xs"
              icon="codicon:arrow-up"
              label="Parent folder"
              disabled={parent === null}
              onClick={() => (parent === null ? undefined : setPinned(parent))}
            />
            <IconButton
              size="xs"
              icon={pinned === null ? 'codicon:pin' : 'codicon:pinned'}
              label={pinned === null ? 'Stay in this folder' : 'Follow the terminal again'}
              toggled={pinned !== null}
              onClick={() => setPinned(pinned === null ? root : null)}
            />
            <IconButton
              size="xs"
              icon={showHidden ? 'codicon:eye' : 'codicon:eye-closed'}
              label={showHidden ? 'Hide hidden files' : 'Show hidden files'}
              toggled={showHidden}
              onClick={() => setShowHidden(!showHidden)}
            />
            <IconButton
              size="xs"
              icon="codicon:refresh"
              label="Refresh"
              onClick={() => resetTo(root, showHidden)}
            />
          </>
        }
      />
      <p className="truncate px-4 pb-1.5 font-mono text-2xs text-fg-muted" title={root}>
        {tildify(root, api.context.home)}
      </p>
      <SidebarContent aria-label="Files">
        <FolderContents
          listing={listings.get(root)}
          render={(entries) => (
            <Tree
              aria-label={`Files in ${baseName(root)}`}
              className="px-2 pb-2"
              selected={selected}
              onSelect={setSelected}
              onAction={(path) => {
                const node = nodeOf(path);
                if (node === undefined) return;
                if (node.isDir) api.changeFolder(node.path);
                else api.openPath(node.path);
              }}
              expanded={expanded}
              onExpandedChange={(ids) => {
                for (const id of ids) if (!expanded.includes(id)) load(id);
                setExpanded(ids);
              }}
            >
              {entries.map((entry) => (
                <FileTreeItem key={entry.path} node={entry} listings={listings} />
              ))}
            </Tree>
          )}
        />
      </SidebarContent>
    </div>
  );
}

function FolderContents({
  listing,
  render,
}: {
  readonly listing: Listing | undefined;
  readonly render: (entries: readonly FileNode[]) => ReactNode;
}) {
  if (listing === undefined || listing.status === 'loading') {
    return <p className="px-4 py-2 text-fg-muted text-sm">Loading…</p>;
  }
  if (listing.status === 'error') {
    return (
      <EmptyState
        size="sm"
        icon="codicon:warning"
        title="Can’t list this folder"
        description={listing.message}
      />
    );
  }
  if (listing.entries.length === 0) {
    return <p className="px-4 py-2 text-fg-muted text-sm">This folder is empty.</p>;
  }
  return render(listing.entries);
}

function FileTreeItem({
  node,
  listings,
}: {
  readonly node: FileNode;
  readonly listings: ReadonlyMap<string, Listing>;
}) {
  const listing = node.isDir ? listings.get(node.path) : undefined;

  return (
    <TreeItem
      id={node.path}
      textValue={node.name}
      label={
        <span className={cn('truncate', node.git !== null && GIT_TONE[node.git])}>{node.name}</span>
      }
      icon={fileIcon(node)}
      {...(node.isDir ? { expandedIcon: 'codicon:folder-opened' as const } : {})}
      title={node.path}
      trailing={
        node.git === null ? undefined : (
          <span className={cn('font-mono text-2xs', GIT_TONE[node.git])}>
            {GIT_LETTER[node.git]}
          </span>
        )
      }
      data-context-zone="file-node"
      data-path={node.path}
      data-dir={node.isDir ? '' : undefined}
    >
      {node.isDir ? (
        listing?.status === 'ready' ? (
          listing.entries.map((entry) => (
            <FileTreeItem key={entry.path} node={entry} listings={listings} />
          ))
        ) : (
          <TreeItem
            id={`${node.path}\u0000placeholder`}
            label={listing?.status === 'error' ? listing.message : 'Loading…'}
            disabled
          />
        )
      ) : null}
    </TreeItem>
  );
}
