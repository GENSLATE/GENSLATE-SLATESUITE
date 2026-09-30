import { useEffect, useEffectEvent, useState } from 'react';

import type { GalleryBackend } from '../ipc/gallery.client';
import { listenTo } from '../ipc/gallery.events';
import type { MediaItem, Query, ScanDone, ScanProgress, Summary } from '../ipc/gallery.types';

/** Library changes arrive in bursts (a scan batch, a watcher event); refetch once per burst. */
const SETTLE_MS = 150;

export interface LibraryState {
  readonly summary: Summary | null;
  readonly items: readonly MediaItem[];
  readonly loading: boolean;
  readonly revision: number;
  readonly scan: ScanProgress | null;
  /** Refetch now (after the UI's own changes, in case events are unavailable). */
  reload(): void;
}

/**
 * The side panel's summary and the current view's items, refetched when the query changes
 * or the library does. The newest request wins, so fast typing never shows stale results.
 */
export function useLibrary(
  backend: GalleryBackend,
  query: Query,
  onScanDone: (done: ScanDone) => void,
  onError: (error: unknown) => void,
): LibraryState {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<readonly MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [scan, setScan] = useState<ScanProgress | null>(null);
  const key = JSON.stringify(query);

  const failed = useEffectEvent((error: unknown) => onError(error));
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is the refetch signal (the library changed)
  useEffect(() => {
    let active = true;
    setLoading(true);
    const request = JSON.parse(key) as Query;
    Promise.all([backend.summary(), backend.query(request)]).then(
      ([nextSummary, nextItems]) => {
        if (!active) return;
        setSummary(nextSummary);
        setItems(nextItems);
        setLoading(false);
      },
      (error: unknown) => {
        if (!active) return;
        setLoading(false);
        failed(error);
      },
    );
    return () => {
      active = false;
    };
  }, [backend, key, revision]);

  const scanFinished = useEffectEvent((done: ScanDone) => onScanDone(done));
  useEffect(() => {
    let timer: number | undefined;
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setRevision((value) => value + 1), SETTLE_MS);
    };
    const stop = listenTo(backend, {
      libraryChanged: bump,
      scanProgress: setScan,
      scanDone: (done) => {
        setScan(null);
        bump();
        scanFinished(done);
      },
    });
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [backend]);

  return {
    summary,
    items,
    loading,
    revision,
    scan,
    reload: () => setRevision((value) => value + 1),
  };
}
