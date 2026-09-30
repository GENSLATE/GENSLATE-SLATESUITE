import { useToast } from '@genslate/design-system';
import { useEffect, useEffectEvent, useState } from 'react';

import type { GalleryBackend } from '../ipc/gallery.client';
import { listenTo } from '../ipc/gallery.events';
import type { DuplicatesDone, ExportDone, ExportOptions } from '../ipc/gallery.types';
import { plural } from '../model/format.util';
import { baseName } from '../model/path.util';
import type { DuplicatesState, Task } from './gallery.context';

let counter = 0;
const taskId = (kind: string) => `${kind}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** The duplicate finder and exports: background work with progress in the status bar. */
export function useTasks(backend: GalleryBackend, report: (title: string, error: unknown) => void) {
  const toast = useToast();
  const [tasks, setTasks] = useState<readonly Task[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicatesState>({ status: 'idle' });

  const finish = (id: string) => setTasks((current) => current.filter((task) => task.id !== id));

  const onDuplicates = useEffectEvent((done: DuplicatesDone) => {
    finish(done.id);
    if (done.error !== null) {
      setDuplicates({ status: 'idle' });
      report('Couldn’t look for duplicates', done.error);
    } else if (done.groups === null) {
      setDuplicates({ status: 'idle' });
    } else {
      setDuplicates({ status: 'done', groups: done.groups });
    }
  });
  const onExport = useEffectEvent((done: ExportDone) => {
    finish(done.id);
    if (done.error !== null) {
      report('Couldn’t export', done.error);
      return;
    }
    const where = `“${baseName(done.destination)}”`;
    toast.add({
      title: done.cancelled
        ? `Export stopped after ${plural(done.written, 'item')}`
        : `Exported ${plural(done.written, 'item')} to ${where}`,
      description:
        done.failed.length > 0
          ? `${plural(done.failed.length, 'item')} couldn’t be exported: ${done.failed[0]?.[1] ?? ''}`
          : undefined,
      type: done.failed.length > 0 || done.cancelled ? 'warning' : 'success',
    });
  });

  useEffect(
    () =>
      listenTo(backend, {
        taskProgress: (progress) =>
          setTasks((current) =>
            current.map((task) =>
              task.id === progress.id
                ? { ...task, done: progress.done, total: progress.total }
                : task,
            ),
          ),
        duplicatesDone: (done) => onDuplicates(done),
        exportDone: (done) => onExport(done),
      }),
    [backend],
  );

  return {
    tasks,
    duplicates,
    findDuplicates() {
      if (duplicates.status === 'running') return;
      const id = taskId('duplicates');
      setDuplicates({ status: 'running', id });
      setTasks((current) => [
        ...current,
        { id, kind: 'duplicates', label: 'Finding duplicates', done: 0, total: 0 },
      ]);
      backend.findDuplicates(id).catch((error: unknown) => {
        finish(id);
        setDuplicates({ status: 'idle' });
        report('Couldn’t look for duplicates', error);
      });
    },
    exportItems(ids: readonly number[], options: ExportOptions) {
      const id = taskId('export');
      const label = `Exporting ${plural(ids.length, 'item')}`;
      setTasks((current) => [
        ...current,
        { id, kind: 'export', label, done: 0, total: ids.length },
      ]);
      backend.exportMedia(id, ids, options, null).then(
        (folder) => {
          if (folder === null) finish(id);
        },
        (error: unknown) => {
          finish(id);
          report('Couldn’t export', error);
        },
      );
    },
    cancelTask(id: string) {
      backend.cancelTask(id).catch((error: unknown) => report('Couldn’t stop it', error));
    },
  };
}
