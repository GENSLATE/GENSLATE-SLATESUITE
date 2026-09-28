import { Badge, Button, Icon, Spinner } from '@genslate/design-system';

import { useExplorer } from '../../app/explorer.context';
import { plural } from '../../model/format.util';
import { baseName } from '../../model/path.util';
import type { SearchState } from '../../model/tabs.reducer';

/** Above search results: what is being searched, how it is going, and the way back. */
export function SearchBanner({ search }: { readonly search: SearchState }) {
  const api = useExplorer();
  const found = plural(search.results.length, 'result');
  const where = baseName(api.tab.path);

  let status: string;
  if (search.status === 'running') status = `Searching… ${found} so far`;
  else if (search.status === 'failed') status = search.error ?? 'The search failed';
  else if (search.summary?.cancelled === true) status = `Stopped · ${found}`;
  else if (search.summary?.truncated === true) status = `${found} (showing the first ones)`;
  else status = `${found} · ${plural(search.summary?.scanned ?? 0, 'item')} searched`;

  return (
    <div
      data-slot="search-banner"
      role="status"
      className="hairline-b flex h-8 shrink-0 items-center gap-2 bg-surface-panel px-3 text-sm"
    >
      {search.status === 'running' ? (
        <Spinner size={14} decorative />
      ) : (
        <Icon name="codicon:search" size={14} className="text-fg-muted" />
      )}
      <span className="truncate text-fg">
        “{search.text}” in <span className="font-medium text-fg-strong">{where}</span> and its
        subfolders
      </span>
      {search.contents ? (
        <Badge size="sm" tone="neutral">
          Names and contents
        </Badge>
      ) : null}
      <span className="ml-auto shrink-0 text-fg-muted tabular-nums">{status}</span>
      {search.status === 'running' ? (
        <Button size="xs" variant="ghost" onClick={() => api.cancelTask(search.id)}>
          Stop
        </Button>
      ) : null}
      <Button size="xs" variant="ghost" leadingIcon="codicon:close" onClick={api.clearSearch}>
        Back to folder
      </Button>
    </div>
  );
}
