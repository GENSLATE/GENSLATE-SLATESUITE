import { cn, Icon } from '@genslate/design-system';

import { useExplorer } from '../../app/explorer.context';
import type { Entry } from '../../ipc/explorer.types';
import { entryIcon } from '../../model/file-icon.util';
import { formatBytes, formatDate, kindLabel } from '../../model/format.util';
import { parentOf } from '../../model/path.util';
import type { DetailsColumn } from './details-columns.util';
import { startDrag, useDropTarget } from './drag-drop.hook';
import { RenameField } from './rename-field.component';
import type { useFileView } from './use-file-view.hook';

type ItemHandlers = ReturnType<ReturnType<typeof useFileView>['itemHandlers']>;

interface DetailsRowProps {
  readonly entry: Entry;
  readonly index: number;
  readonly setSize: number;
  readonly top: number;
  readonly columns: readonly DetailsColumn[];
  readonly selected: boolean;
  readonly cursor: boolean;
  readonly cut: boolean;
  readonly handlers: ItemHandlers;
  /** The paths a drag of this row carries. */
  readonly dragPaths: () => readonly string[];
}

export function detailsCellText(entry: Entry, column: DetailsColumn['id']): string {
  switch (column) {
    case 'modified':
      return formatDate(entry.modified);
    case 'kind':
      return kindLabel(entry);
    case 'size':
      return entry.isDir || entry.size === null ? '' : formatBytes(entry.size);
    case 'location':
      return parentOf(entry.path) ?? '';
    case 'name':
      return entry.name;
  }
}

/** One row of the details list (absolutely positioned: only visible rows are rendered). */
export function DetailsRow({
  entry,
  index,
  setSize,
  top,
  columns,
  selected,
  cursor,
  cut,
  handlers,
  dragPaths,
}: DetailsRowProps) {
  const api = useExplorer();
  const drop = useDropTarget(entry.isDir ? entry.path : null);
  const renaming = api.renaming === entry.path;

  return (
    // biome-ignore lint/a11y/useFocusableInteractive lint/a11y/useKeyWithClickEvents: the list owns focus and keys (aria-activedescendant).
    <div
      role="option"
      id={`explorer-item-${index}`}
      aria-posinset={index + 1}
      aria-setsize={setSize}
      aria-selected={selected}
      data-path={entry.path}
      data-context-zone="file"
      data-cursor={cursor ? '' : undefined}
      draggable={!renaming}
      onDragStart={(event) => {
        handlers.onDragStart();
        startDrag(event, dragPaths());
      }}
      {...drop.handlers}
      onMouseDown={handlers.onMouseDown}
      onClick={handlers.onClick}
      onDoubleClick={handlers.onDoubleClick}
      onAuxClick={handlers.onAuxClick}
      onContextMenu={handlers.onContextMenu}
      style={{ top }}
      className={cn(
        'absolute inset-x-1.5 flex h-row-sm cursor-default items-center rounded-sm text-base text-fg',
        'hover:bg-fill-hover',
        'aria-selected:bg-selection-inactive aria-selected:text-fg-strong',
        'group-focus-within/view:aria-selected:bg-selection',
        'window-inactive:group-focus-within/view:aria-selected:bg-selection-inactive',
        'group-focus-visible/view:data-cursor:outline group-focus-visible/view:data-cursor:outline-1 group-focus-visible/view:data-cursor:outline-focus group-focus-visible/view:data-cursor:-outline-offset-1',
        drop.over && 'bg-accent-subtle outline outline-1 outline-accent-border -outline-offset-1',
        cut && 'opacity-55',
      )}
    >
      {columns.map((column) =>
        column.id === 'name' ? (
          <div key={column.id} className="flex min-w-0 flex-1 items-center gap-1.5 pr-2 pl-1.5">
            <Icon
              name={entryIcon(entry)}
              size={16}
              className={entry.isDir ? 'text-accent-fg' : 'text-fg-muted'}
            />
            {renaming ? (
              <RenameField entry={entry} className="flex-1" />
            ) : (
              <span className={cn('truncate', entry.hidden && 'text-fg-secondary')}>
                {entry.name}
              </span>
            )}
          </div>
        ) : (
          <div
            key={column.id}
            style={{ width: column.width }}
            className={cn(
              'shrink-0 truncate px-2 text-fg-secondary text-sm tabular-nums',
              column.align === 'end' && 'text-right',
            )}
            title={column.id === 'location' ? detailsCellText(entry, column.id) : undefined}
          >
            {detailsCellText(entry, column.id)}
          </div>
        ),
      )}
    </div>
  );
}
