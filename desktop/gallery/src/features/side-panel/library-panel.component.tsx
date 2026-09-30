import { IconButton, SidebarContent, SidebarItem, SidebarSection } from '@genslate/design-system';

import { useGallery } from '../../app/gallery.context';
import type { Collection } from '../../ipc/gallery.types';
import { SMART, sameCollection } from '../../model/collection.util';

/** The most used tags listed (the rest are a search away). */
const TOP_TAGS = 12;

/** The Library tab: smart collections, albums and tags. */
export function LibraryPanel() {
  const api = useGallery();
  const { summary } = api;
  const go = (collection: Collection) => {
    api.setMode({ type: 'browse' });
    api.setCollection(collection);
  };
  const isCurrent = (collection: Collection) => sameCollection(api.collection, collection);

  return (
    <SidebarContent aria-label="Library">
      <SidebarSection title="Collections">
        {SMART.map((entry) => {
          const collection: Collection = { type: entry.type };
          const count = summary?.counts[entry.count];
          if (entry.type === 'trash' && count === 0) return null;
          return (
            <SidebarItem
              key={entry.type}
              icon={entry.icon}
              selected={isCurrent(collection)}
              current="page"
              count={count}
              data-context-zone="collection"
              onClick={() => go(collection)}
            >
              {entry.label}
            </SidebarItem>
          );
        })}
      </SidebarSection>
      <SidebarSection
        title="Albums"
        actions={
          <IconButton
            size="xs"
            icon="codicon:add"
            label="New album"
            onClick={() => api.openDialog({ type: 'new-album', ids: [] })}
          />
        }
      >
        {summary === null || summary.albums.length === 0 ? (
          <p className="mx-4 py-1 text-fg-muted text-sm">Select photos and choose Add to album.</p>
        ) : (
          summary.albums.map((album) => (
            <SidebarItem
              key={album.id}
              icon="codicon:book"
              selected={isCurrent({ type: 'album', id: album.id })}
              current="page"
              count={album.count}
              data-context-zone="album"
              data-album-id={album.id}
              onClick={() => go({ type: 'album', id: album.id })}
            >
              {album.name}
            </SidebarItem>
          ))
        )}
      </SidebarSection>
      {summary === null || summary.tags.length === 0 ? null : (
        <SidebarSection title="Tags" collapsible defaultOpen>
          {summary.tags.slice(0, TOP_TAGS).map((tag) => (
            <SidebarItem
              key={tag.name}
              icon="codicon:tag"
              selected={isCurrent({ type: 'tag', name: tag.name })}
              current="page"
              count={tag.count}
              data-context-zone="tag"
              data-tag={tag.name}
              onClick={() => go({ type: 'tag', name: tag.name })}
            >
              {tag.name}
            </SidebarItem>
          ))}
        </SidebarSection>
      )}
    </SidebarContent>
  );
}
