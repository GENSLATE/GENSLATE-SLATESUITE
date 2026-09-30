import { Banner, Button, EmptyState, Spinner } from '@genslate/design-system';

import { runCommand } from '../../app/commands.registry';
import { useGallery } from '../../app/gallery.context';
import { collectionTitle } from '../../model/collection.util';
import { DetailsView } from './details-view.component';
import { PhotoView } from './photo-view.component';
import { Welcome } from './welcome.component';

/** The browse area: the welcome screen, an empty state, or the chosen view. */
export function MediaView() {
  const api = useGallery();
  const { summary, items, settings, collection } = api;

  if (summary !== null && summary.roots.length === 0) return <Welcome />;
  if (summary === null || (api.loading && items.length === 0)) {
    return (
      <div className="grid flex-1 place-items-center">
        <Spinner size={20} label="Loading your photos" />
      </div>
    );
  }

  const describing = api.searchMode === 'describe' && api.search.trim() !== '';
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {describing ? (
        <Banner
          variant="bar"
          tone="info"
          icon="codicon:search-sparkle"
          title="Search by description is coming soon"
          actions={
            <Button size="xs" variant="ghost" onClick={() => api.setSearchMode('words')}>
              Search words instead
            </Button>
          }
        >
          Gallery will find “{api.search.trim()}” by looking at the pictures themselves, on your
          computer. For now it shows everything.
        </Banner>
      ) : null}
      {collection.type === 'trash' && items.length > 0 ? (
        <Banner variant="bar" tone="neutral" icon="codicon:trash">
          These files are in your system Trash.{' '}
          {api.context.canRestore
            ? 'Select them to put them back, or remove them from this list.'
            : 'Put them back from the system Trash, or remove them from this list.'}
        </Banner>
      ) : null}
      {items.length === 0 ? (
        <Empty title={collectionTitle(collection, summary)} />
      ) : settings.view === 'details' ? (
        <DetailsView />
      ) : (
        <PhotoView variant={settings.view} />
      )}
    </div>
  );
}

function Empty({ title }: { readonly title: string }) {
  const api = useGallery();
  const filtered =
    (api.searchMode === 'words' && api.search.trim() !== '') ||
    api.filters.favoritesOnly ||
    api.filters.minRating > 0 ||
    api.filters.kind !== null;
  if (filtered) {
    return (
      <EmptyState
        className="flex-1"
        icon="codicon:search"
        title="Nothing matches"
        description={`No items in ${title} match the search and filters.`}
        actions={
          <Button
            size="sm"
            onClick={() => {
              api.setSearch('');
              api.setFilters({ favoritesOnly: false, minRating: 0, kind: null });
            }}
          >
            Clear search and filters
          </Button>
        }
      />
    );
  }
  switch (api.collection.type) {
    case 'favorites':
      return (
        <EmptyState
          className="flex-1"
          icon="codicon:heart"
          title="No favorites yet"
          description="Press F (or click the heart in the viewer) to keep your best shots here."
        />
      );
    case 'trash':
      return (
        <EmptyState
          className="flex-1"
          icon="codicon:trash"
          title="The Trash is empty"
          description="Items you move to the Trash from Gallery are listed here until you put them back."
        />
      );
    case 'album':
      return (
        <EmptyState
          className="flex-1"
          icon="codicon:book"
          title="This album is empty"
          description="Select photos anywhere, then right-click › Add to album."
        />
      );
    default:
      return (
        <EmptyState
          className="flex-1"
          icon="codicon:device-camera"
          title={`No items in ${title}`}
          actions={
            <Button
              size="sm"
              leadingIcon="codicon:new-folder"
              onClick={() => runCommand('add-folder', api)}
            >
              Add a folder
            </Button>
          }
        />
      );
  }
}
