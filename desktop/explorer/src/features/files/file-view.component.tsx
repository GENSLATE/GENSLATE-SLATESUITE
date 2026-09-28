import { Button, EmptyState, Spinner } from '@genslate/design-system';

import { useExplorer } from '../../app/explorer.context';
import { plural } from '../../model/format.util';
import { baseName, parentOf } from '../../model/path.util';
import { DetailsView } from './details-view.component';
import { GridView } from './grid-view.component';
import { SearchBanner } from './search-banner.component';

/** The content area: the active tab's folder (or search results) in its view, or a state. */
export function FileView() {
  const api = useExplorer();
  const { tab, listing } = api;

  if (tab.search === null && listing?.status === 'error') {
    const parent = parentOf(tab.path);
    return (
      <div className="grid flex-1 place-items-center p-8" data-context-zone="files">
        <EmptyState
          icon="codicon:warning"
          title={`Can’t open “${baseName(tab.path)}”`}
          description={listing.error}
          actions={
            <>
              <Button size="sm" onClick={() => api.loadFolder(tab.path)}>
                Try again
              </Button>
              {parent === null ? null : (
                <Button size="sm" variant="ghost" onClick={() => api.navigate(parent)}>
                  Go to “{baseName(parent)}”
                </Button>
              )}
            </>
          }
        />
      </div>
    );
  }

  if (tab.search === null && (listing === undefined || listing.listing === null)) {
    return (
      <div className="grid flex-1 place-items-center" aria-busy>
        <Spinner size={20} label="Loading the folder" />
      </div>
    );
  }

  return (
    <>
      {tab.search === null ? null : <SearchBanner search={tab.search} />}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {tab.view === 'details' ? <DetailsView /> : <GridView mode={tab.view} />}
        <EmptyOverlay />
      </div>
    </>
  );
}

/** Why the view is empty, over its (still droppable, right-clickable) background. */
function EmptyOverlay() {
  const api = useExplorer();
  const { tab, listing, visible } = api;
  if (visible.length > 0) return null;

  let content: { title: string; description?: string; action?: { label: string; run: () => void } };
  if (tab.search !== null) {
    if (tab.search.status === 'running') return null;
    content = {
      title: 'No matches',
      description: `Nothing in “${baseName(tab.path)}” matches “${tab.search.text}”.`,
      ...(tab.search.contents
        ? {}
        : {
            action: {
              label: 'Search inside files too',
              run: () => api.search(tab.search?.text ?? '', true),
            },
          }),
    };
  } else if (tab.filter !== '') {
    content = {
      title: 'No matches',
      description: `No names here contain “${tab.filter}”.`,
      action: {
        label: 'Search subfolders',
        run: () => api.search(tab.filter, false),
      },
    };
  } else {
    const hidden = listing?.listing?.hiddenCount ?? 0;
    content = {
      title: 'This folder is empty',
      ...(hidden > 0
        ? {
            description: `${plural(hidden, 'hidden item')}.`,
            action: {
              label: 'Show hidden items',
              run: () => api.updateSetting('showHidden', true),
            },
          }
        : { description: 'Drop files here, or create something new.' }),
    };
  }

  return (
    <div className="pointer-events-none absolute inset-0 top-8 grid place-items-center p-8">
      <EmptyState
        size="sm"
        icon={tab.search === null && tab.filter === '' ? 'codicon:folder-opened' : 'codicon:search'}
        title={content.title}
        description={content.description}
        actions={
          content.action === undefined ? undefined : (
            <Button size="sm" className="pointer-events-auto" onClick={content.action.run}>
              {content.action.label}
            </Button>
          )
        }
      />
    </div>
  );
}
