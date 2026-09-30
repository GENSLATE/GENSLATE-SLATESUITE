import {
  Button,
  IconButton,
  SidebarContent,
  SidebarSection,
  Tree,
  TreeItem,
} from '@genslate/design-system';
import { useState } from 'react';

import { useGallery } from '../../app/gallery.context';
import type { FolderNode } from '../../ipc/gallery.types';

/** The Folders tab: the library's folders as a tree, with counts; add, rescan or remove them. */
export function FoldersPanel() {
  const api = useGallery();
  const folders = api.summary?.folders ?? [];
  const [expanded, setExpanded] = useState<readonly string[]>(() =>
    folders.map((folder) => folder.path),
  );
  const selected = api.collection.type === 'folder' ? api.collection.path : null;

  return (
    <SidebarContent aria-label="Folders">
      <SidebarSection
        title="Library folders"
        actions={
          <>
            <IconButton
              size="xs"
              icon="codicon:refresh"
              label="Rescan"
              tooltipShortcut="F5"
              onClick={api.rescan}
            />
            <IconButton
              size="xs"
              icon="codicon:new-folder"
              label="Add a folder"
              tooltipShortcut="mod+shift+o"
              onClick={api.addFolder}
            />
          </>
        }
      >
        {folders.length === 0 ? (
          <div className="mx-4 flex flex-col items-start gap-2 py-1">
            <p className="text-fg-muted text-sm">
              Gallery shows the photos in the folders you add. Files stay where they are.
            </p>
            <Button size="sm" leadingIcon="codicon:new-folder" onClick={api.addFolder}>
              Add a folder
            </Button>
          </div>
        ) : (
          <Tree
            aria-label="Library folders"
            className="px-2"
            selected={selected}
            onSelect={(path) => {
              api.setMode({ type: 'browse' });
              api.setCollection({ type: 'folder', path });
            }}
            expanded={expanded}
            onExpandedChange={setExpanded}
          >
            {folders.map((folder) => (
              <Folder key={folder.path} node={folder} root />
            ))}
          </Tree>
        )}
      </SidebarSection>
    </SidebarContent>
  );
}

function Folder({ node, root = false }: { readonly node: FolderNode; readonly root?: boolean }) {
  return (
    <TreeItem
      id={node.path}
      label={node.name}
      icon={root ? 'codicon:root-folder' : 'codicon:folder'}
      expandedIcon={root ? 'codicon:root-folder-opened' : 'codicon:folder-opened'}
      title={node.path}
      data-context-zone={root ? 'root' : 'folder'}
      data-path={node.path}
      trailing={
        <span className="text-2xs text-fg-muted tabular-nums">{node.count.toLocaleString()}</span>
      }
    >
      {node.children.length === 0
        ? undefined
        : node.children.map((child) => <Folder key={child.path} node={child} />)}
    </TreeItem>
  );
}
