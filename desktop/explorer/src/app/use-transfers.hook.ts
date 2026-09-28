import { useToast } from '@genslate/design-system';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import type { ExplorerBackend } from '../ipc/explorer.client';
import { listenTo } from '../ipc/explorer.events';
import type { ConflictPolicy, TaskDone, TransferMode } from '../ipc/explorer.types';
import { plural } from '../model/format.util';
import { baseName, parentOf } from '../model/path.util';
import { errorMessage } from './error-message.util';
import type { DialogState, TransferTask } from './explorer.context';

export interface TransfersOptions {
  readonly backend: ExplorerBackend;
  /** Opens the conflict dialog. */
  readonly openDialog: (dialog: DialogState) => void;
  /** Folders to reload after a transfer. */
  readonly refresh: (folders: readonly string[]) => void;
  /** Called with where the items landed (to select them). */
  readonly onLanded: (destination: string, targets: readonly string[]) => void;
  readonly undo: () => void;
}

export interface Transfers {
  readonly tasks: readonly TransferTask[];
  transfer(
    mode: TransferMode,
    sources: readonly string[],
    destination: string,
    policy?: ConflictPolicy,
  ): void;
  cancel(id: string): void;
}

const VERB = { copy: ['Copying', 'Copied'], move: ['Moving', 'Moved'] } as const;

let counter = 0;

/**
 * Copies and moves: asks about name conflicts first, runs the transfer on the backend, shows
 * its progress (status bar) and reports the result as a toast with Undo.
 */
export function useTransfers({
  backend,
  openDialog,
  refresh,
  onLanded,
  undo,
}: TransfersOptions): Transfers {
  const toast = useToast();
  const [tasks, setTasks] = useState<readonly TransferTask[]>([]);
  // Where each running task comes from and goes, to refresh both folders when it ends.
  const running = useRef(new Map<string, { sources: readonly string[]; destination: string }>());

  const onProgress = useEffectEvent((id: string, progress: TransferTask['progress']) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, progress } : task))),
  );
  const onDone = useEffectEvent((done: TaskDone) => {
    setTasks((current) => current.filter((task) => task.id !== done.id));
    const meta = running.current.get(done.id);
    running.current.delete(done.id);
    const destination = meta?.destination ?? parentOf(done.targets[0] ?? '') ?? '';
    const folders = [destination, ...(meta?.sources ?? []).map((source) => parentOf(source) ?? '')];
    refresh(folders.filter((folder) => folder !== ''));
    report(done, destination);
  });

  useEffect(
    () =>
      listenTo(backend, {
        progress: (id, progress) => onProgress(id, progress),
        taskDone: (done) => onDone(done),
      }),
    [backend],
  );

  function report(done: TaskDone, destination: string) {
    const [, past] = VERB[done.mode];
    if (done.error !== null) {
      toast.add({
        title: `${past.replace('ed', 'ing')} failed`,
        description: done.error.message,
        type: 'error',
      });
      return;
    }
    if (done.cancelled) {
      toast.add({
        title: 'Stopped',
        description: `${plural(done.done, 'item')} finished before it stopped.`,
        type: 'info',
      });
      return;
    }
    if (done.done === 0) {
      toast.add({
        title: 'Nothing to do',
        description: `${plural(done.skipped, 'item')} skipped.`,
        type: 'info',
      });
      return;
    }
    onLanded(destination, done.targets);
    toast.add({
      title: `${past} ${plural(done.done, 'item')}`,
      description: `to ${baseName(destination)}${done.skipped > 0 ? ` · ${done.skipped} skipped` : ''}`,
      type: 'success',
      actionProps: { children: 'Undo', onClick: undo },
    });
  }

  function start(
    mode: TransferMode,
    sources: readonly string[],
    destination: string,
    policy: ConflictPolicy,
  ) {
    counter += 1;
    const id = `transfer-${Date.now().toString(36)}-${counter}`;
    running.current.set(id, { sources, destination });
    setTasks((current) => [
      ...current,
      { id, mode, count: sources.length, destination, progress: null },
    ]);
    backend.startTransfer(id, mode, sources, destination, policy).catch((error: unknown) => {
      setTasks((current) => current.filter((task) => task.id !== id));
      toast.add({
        title: `${VERB[mode][0]} failed`,
        description: errorMessage(error),
        type: 'error',
      });
    });
  }

  return {
    tasks,
    transfer(mode, sources, destination, policy) {
      if (sources.length === 0) return;
      if (policy !== undefined) {
        start(mode, sources, destination, policy);
        return;
      }
      backend.findConflicts(sources, destination).then(
        (names) => {
          if (names.length === 0) start(mode, sources, destination, 'keep-both');
          else openDialog({ type: 'conflict', mode, sources, destination, names });
        },
        (error: unknown) =>
          toast.add({
            title: `${VERB[mode][0]} failed`,
            description: errorMessage(error),
            type: 'error',
          }),
      );
    },
    cancel(id) {
      backend
        .cancelTask(id)
        .catch((error: unknown) =>
          toast.add({ title: 'Could not stop', description: errorMessage(error), type: 'error' }),
        );
    },
  };
}
