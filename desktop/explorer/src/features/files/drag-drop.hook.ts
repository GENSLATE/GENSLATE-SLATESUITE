/**
 * Internal drag and drop: items dragged from a file view, dropped on a folder (a row, the view's
 * background, a breadcrumb, a sidebar place or a tree node). Moves by default; Ctrl (⌥ on
 * macOS) copies, like the system file managers.
 */
import { usePlatform } from '@genslate/design-system';
import { type DragEvent, useState } from 'react';

import { useExplorer } from '../../app/explorer.context';
import type { TransferMode } from '../../ipc/explorer.types';
import { isInside, parentOf, samePath } from '../../model/path.util';

const DRAG_TYPE = 'application/x-genslate-paths';

/** Starts dragging `paths` (the selection, or the item under the pointer). */
export function startDrag(event: DragEvent, paths: readonly string[]): void {
  event.dataTransfer.effectAllowed = 'copyMove';
  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(paths));
  // Other apps get the paths as text.
  event.dataTransfer.setData('text/plain', paths.join('\n'));
}

function draggedPaths(event: DragEvent): readonly string[] {
  try {
    const value: unknown = JSON.parse(event.dataTransfer.getData(DRAG_TYPE));
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    // Not one of ours (or malformed): nothing to drop.
    return [];
  }
}

/** Handlers that make an element a drop target for `folder` (`null`: not a target). */
export function useDropTarget(folder: string | null) {
  const api = useExplorer();
  const platform = usePlatform();
  const [over, setOver] = useState(false);

  const modeOf = (event: DragEvent): TransferMode =>
    (platform === 'macos' ? event.altKey : event.ctrlKey) ? 'copy' : 'move';

  const accepts = (event: DragEvent) =>
    folder !== null && event.dataTransfer.types.includes(DRAG_TYPE);

  return {
    over,
    handlers: {
      onDragOver(event: DragEvent) {
        if (!accepts(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = modeOf(event);
        if (!over) setOver(true);
      },
      onDragLeave(event: DragEvent) {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setOver(false);
      },
      onDrop(event: DragEvent) {
        setOver(false);
        if (folder === null || !accepts(event)) return;
        event.preventDefault();
        event.stopPropagation();
        const mode = modeOf(event);
        // Dropping a folder into itself, or items back where they are, does nothing.
        const sources = draggedPaths(event).filter((path) => {
          if (isInside(folder, path)) return false;
          const parent = parentOf(path);
          return mode === 'copy' || parent === null || !samePath(parent, folder);
        });
        if (sources.length > 0) api.transfer(mode, sources, folder);
      },
    },
  };
}
