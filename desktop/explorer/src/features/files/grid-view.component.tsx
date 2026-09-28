import { cn } from '@genslate/design-system';

import { useExplorer } from '../../app/explorer.context';
import type { Entry } from '../../ipc/explorer.types';
import { formatBytes, kindLabel } from '../../model/format.util';
import { startDrag, useDropTarget } from './drag-drop.hook';
import { FileGlyph } from './file-glyph.component';
import { cellBox, contentHeight, gridLayout, visibleRange } from './file-layout.util';
import { FileViewFrame } from './file-view-frame.component';
import { RenameField } from './rename-field.component';
import { useFileView } from './use-file-view.hook';
import { useViewport } from './use-viewport.hook';

const CELLS = {
  icons: { width: 104, height: 108 },
  tiles: { width: 248, height: 60 },
} as const;
const PADDING = 12;
const GAP = 6;

interface GridViewProps {
  readonly mode: 'icons' | 'tiles';
}

/** Icons (large glyphs and thumbnails) or tiles (glyph, name, kind and size) in a grid. */
export function GridView({ mode }: GridViewProps) {
  const api = useExplorer();
  const { viewport, ref, element } = useViewport();
  const layout = gridLayout(viewport.width, CELLS[mode], PADDING, GAP);
  const view = useFileView({ layout, element, stickyTop: 0 });
  const { visible } = api;
  const range = visibleRange(layout, visible.length, viewport.scrollTop, viewport.height);
  const cut = api.clipboard?.mode === 'move' ? new Set(api.clipboard.paths) : null;

  return (
    <FileViewFrame
      scrollRef={ref}
      view={view}
      layout={layout}
      height={contentHeight(layout, visible.length, PADDING)}
    >
      {visible.slice(range.start, range.end).map((entry, offset) => {
        const index = range.start + offset;
        const box = cellBox(layout, index);
        return (
          <GridItem
            key={entry.path}
            mode={mode}
            entry={entry}
            index={index}
            setSize={visible.length}
            box={box}
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

interface GridItemProps {
  readonly mode: 'icons' | 'tiles';
  readonly entry: Entry;
  readonly index: number;
  readonly setSize: number;
  readonly box: ReturnType<typeof cellBox>;
  readonly selected: boolean;
  readonly cursor: boolean;
  readonly cut: boolean;
  readonly handlers: ReturnType<ReturnType<typeof useFileView>['itemHandlers']>;
  readonly dragPaths: () => readonly string[];
}

function GridItem({
  mode,
  entry,
  index,
  setSize,
  box,
  selected,
  cursor,
  cut,
  handlers,
  dragPaths,
}: GridItemProps) {
  const api = useExplorer();
  const drop = useDropTarget(entry.isDir ? entry.path : null);
  const renaming = api.renaming === entry.path;
  const icons = mode === 'icons';
  const detail = entry.isDir
    ? kindLabel(entry)
    : `${kindLabel(entry)}${entry.size === null ? '' : ` · ${formatBytes(entry.size)}`}`;

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
      title={icons ? `${entry.name}\n${detail}` : undefined}
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
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
      className={cn(
        'group/item absolute flex cursor-default rounded-md text-fg',
        icons ? 'flex-col items-center gap-1.5 px-1 pt-2' : 'items-center gap-3 px-2.5',
        'hover:bg-fill-hover',
        'aria-selected:bg-fill-selected-inactive',
        !icons &&
          'group-focus-within/view:aria-selected:bg-selection window-inactive:group-focus-within/view:aria-selected:bg-selection-inactive',
        'group-focus-visible/view:data-cursor:outline group-focus-visible/view:data-cursor:outline-1 group-focus-visible/view:data-cursor:outline-focus group-focus-visible/view:data-cursor:-outline-offset-1',
        drop.over && 'bg-accent-subtle outline outline-1 outline-accent-border -outline-offset-1',
        cut && 'opacity-55',
      )}
    >
      <FileGlyph entry={entry} size={icons ? 'lg' : 'md'} />
      {icons ? (
        renaming ? (
          <RenameField entry={entry} className="w-full text-center" />
        ) : (
          <span
            className={cn(
              'line-clamp-2 max-w-full break-words rounded-xs px-1 text-center text-sm leading-tight',
              'group-aria-selected/item:bg-selection-inactive group-aria-selected/item:text-fg-strong',
              'group-focus-within/view:group-aria-selected/item:bg-selection',
              'window-inactive:group-focus-within/view:group-aria-selected/item:bg-selection-inactive',
              entry.hidden && 'text-fg-secondary',
            )}
          >
            {entry.name}
          </span>
        )
      ) : (
        <span className="flex min-w-0 flex-1 flex-col">
          {renaming ? (
            <RenameField entry={entry} />
          ) : (
            <span
              className={cn(
                'truncate text-base',
                entry.hidden ? 'text-fg-secondary' : 'text-fg-strong',
              )}
            >
              {entry.name}
            </span>
          )}
          <span className="truncate text-fg-muted text-sm tabular-nums">{detail}</span>
        </span>
      )}
    </div>
  );
}
