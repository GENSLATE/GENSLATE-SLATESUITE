import { useEffect, useEffectEvent } from 'react';

import type { ExplorerBackend } from '../ipc/explorer.client';
import { listenTo } from '../ipc/explorer.events';
import type { Entry, SearchDone } from '../ipc/explorer.types';
import type { TabsAction } from '../model/tabs.reducer';
import { errorMessage } from './error-message.util';

let counter = 0;

export interface SearchOptions {
  readonly backend: ExplorerBackend;
  readonly dispatch: (action: TabsAction) => void;
  /** The active tab's running search, to cancel it when a new one starts. */
  readonly runningId: string | null;
  readonly showHidden: boolean;
}

/**
 * Recursive search in the active tab: starts a backend search and streams its matches into
 * the tab (the file view shows them in place of the folder).
 */
export function useSearch({ backend, dispatch, runningId, showHidden }: SearchOptions) {
  const onResults = useEffectEvent((id: string, entries: readonly Entry[]) =>
    dispatch({ type: 'search-results', id, entries }),
  );
  const onDone = useEffectEvent((done: SearchDone) =>
    dispatch({
      type: 'search-done',
      id: done.id,
      summary: done.summary,
      error: done.error?.message ?? null,
    }),
  );

  useEffect(
    () =>
      listenTo(backend, {
        searchResults: (id, entries) => onResults(id, entries),
        searchDone: (done) => onDone(done),
      }),
    [backend],
  );

  const cancelRunning = () => {
    // A search that already ended can't be cancelled; nothing to report.
    if (runningId !== null) backend.cancelTask(runningId).catch(() => undefined);
  };

  return {
    search(root: string, text: string, contents: boolean) {
      cancelRunning();
      if (text.trim() === '') {
        dispatch({ type: 'search-clear' });
        return;
      }
      counter += 1;
      const id = `search-${Date.now().toString(36)}-${counter}`;
      dispatch({ type: 'search-start', id, text, contents });
      backend
        .startSearch(id, { root, text, contents, showHidden })
        .catch((error: unknown) =>
          dispatch({ type: 'search-done', id, summary: null, error: errorMessage(error) }),
        );
    },
    clear() {
      cancelRunning();
      dispatch({ type: 'search-clear' });
    },
  };
}
