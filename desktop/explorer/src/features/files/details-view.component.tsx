import { cn, Icon } from '@genslate/design-system';
import { type PointerEvent, useState } from 'react';

import { useExplorer } from '../../app/explorer.context';
import { loadPreference, savePreference } from '../../app/session.util';
import type { SortKey } from '../../ipc/explorer.types';
import {
  type ColumnWidths,
  type DetailsColumn,
  detailsColumns,
  MAX_WIDTH,
  MIN_WIDTH,
  parseWidths,
} from './details-columns.util';
import { DetailsRow } from './details-row.component';
import { contentHeight, type FileLayout, visibleRange } from './file-layout.util';
import { FileViewFrame } from './file-view-frame.component';
import { useFileView } from './use-file-view.hook';
import { useViewport } from './use-viewport.hook';

const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 28;

/** The details list: sortable, resizable columns and only the visible rows rendered. */
export function DetailsView() {
  const api = useExplorer();
  const { viewport, ref, element } = useViewport();
  const [widths, setWidths] = useState(() => parseWidths(loadPreference('columns')));
  const searching = api.tab.search !== null;
  const columns = detailsColumns(widths, searching);
  const layout: FileLayout = {
    columns: 1,
    cellWidth: Math.max(0, viewport.width - 12),
    rowHeight: ROW_HEIGHT,
    top: HEADER_HEIGHT + 4,
    left: 6,
    gap: 0,
  };
  const view = useFileView({ layout, element, stickyTop: HEADER_HEIGHT });
  const { visible } = api;
  const range = visibleRange(layout, visible.length, viewport.scrollTop, viewport.height);
  const cut = api.clipboard?.mode === 'move' ? new Set(api.clipboard.paths) : null;

  const resize = (id: keyof ColumnWidths, width: number) => {
    const next = { ...widths, [id]: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width))) };
    setWidths(next);
    savePreference('columns', JSON.stringify(next));
  };

  return (
    <FileViewFrame
      scrollRef={ref}
      view={view}
      layout={layout}
      height={contentHeight(layout, visible.length, 8)}
      headerHeight={HEADER_HEIGHT}
      header={
        <DetailsHeader
          columns={columns}
          sortBy={api.tab.sortBy}
          descending={api.tab.sortDescending}
          sortable={!searching}
          onResize={resize}
        />
      }
    >
      {visible.slice(range.start, range.end).map((entry, offset) => {
        const index = range.start + offset;
        return (
          <DetailsRow
            key={entry.path}
            entry={entry}
            index={index}
            setSize={visible.length}
            top={layout.top - HEADER_HEIGHT + index * ROW_HEIGHT}
            columns={columns}
            selected={view.selected.has(entry.path)}
            cursor={index === view.focusIndex}
            cut={cut?.has(entry.path) === true}
            handlers={view.itemHandlers(entry)}
            dragPaths={() => (view.selected.has(entry.path) ? [...view.selected] : [entry.path])}
          />
        );
      })}
    </FileViewFrame>
  );
}

interface DetailsHeaderProps {
  readonly columns: readonly DetailsColumn[];
  readonly sortBy: SortKey;
  readonly descending: boolean;
  readonly sortable: boolean;
  readonly onResize: (id: keyof ColumnWidths, width: number) => void;
}

function DetailsHeader({ columns, sortBy, descending, sortable, onResize }: DetailsHeaderProps) {
  const api = useExplorer();

  const sort = (key: SortKey) =>
    api.dispatch({
      type: 'sort',
      sortBy: key,
      sortDescending: key === sortBy ? !descending : key === 'modified' || key === 'size',
    });

  return (
    <div
      data-slot="details-header"
      className="hairline-b sticky top-0 z-sticky flex h-7 items-stretch bg-canvas px-1.5 text-fg-muted text-xs"
    >
      {columns.map((column) => {
        const active = sortable && column.sort === sortBy;
        const label = (
          <>
            <span className="truncate">{column.label}</span>
            {active ? (
              <Icon
                name={descending ? 'codicon:chevron-down' : 'codicon:chevron-up'}
                size={12}
                className="text-fg-secondary"
              />
            ) : null}
          </>
        );
        const cell = cn(
          'flex min-w-0 items-center gap-1 px-2 font-medium',
          column.id === 'name' ? 'flex-1 pl-7.5' : 'shrink-0',
          column.align === 'end' && 'flex-row-reverse',
        );
        return (
          <div
            key={column.id}
            role="presentation"
            className={cn('relative flex', column.id === 'name' && 'min-w-0 flex-1')}
            style={column.id === 'name' ? undefined : { width: column.width }}
          >
            {column.id !== 'name' ? (
              <ResizeHandle
                label={`Resize ${column.label}`}
                onDrag={(delta) => onResize(column.id as keyof ColumnWidths, column.width - delta)}
              />
            ) : null}
            {column.sort !== null && sortable ? (
              <button
                type="button"
                aria-label={`Sort by ${column.label}`}
                aria-pressed={active}
                onClick={() => (column.sort === null ? undefined : sort(column.sort))}
                className={cn(
                  cell,
                  'focus-ring-inset w-full cursor-interactive rounded-xs hover:text-fg',
                  active && 'text-fg-secondary',
                )}
              >
                {label}
              </button>
            ) : (
              <div className={cn(cell, 'w-full')}>{label}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** A column divider: dragging it left widens the column to its right. */
function ResizeHandle({
  label,
  onDrag,
}: {
  readonly label: string;
  readonly onDrag: (delta: number) => void;
}) {
  const [start, setStart] = useState<number | null>(null);

  return (
    <div
      aria-hidden
      title={label}
      data-dragging={start === null ? undefined : ''}
      onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setStart(event.clientX);
      }}
      onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
        if (start === null) return;
        onDrag(event.clientX - start);
        setStart(event.clientX);
      }}
      onPointerUp={() => setStart(null)}
      onPointerCancel={() => setStart(null)}
      className={cn(
        'group/handle absolute inset-y-1 -left-1 z-raised w-2 cursor-col-resize touch-none',
        'before:absolute before:inset-y-0.5 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border-subtle',
        'hover:before:bg-accent data-dragging:before:bg-accent',
      )}
    />
  );
}
