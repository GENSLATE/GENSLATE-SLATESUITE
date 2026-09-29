import { cn } from '@genslate/design-system';
import { type KeyboardEvent, type PointerEvent, useState } from 'react';

import { useTerminal } from '../../app/terminal.context';
import { clampRatio, type SplitHandle } from '../../model/pane-tree.util';

const KEY_STEP = 0.02;

const percent = (value: number) => `${value * 100}%`;

/**
 * The line between two panes: drag it (or focus it and use the arrow keys) to resize them;
 * double-click to split the space evenly again.
 */
export function SplitDivider({
  tabId,
  handle,
}: {
  readonly tabId: string;
  readonly handle: SplitHandle;
}) {
  const api = useTerminal();
  const [dragging, setDragging] = useState(false);
  const row = handle.direction === 'row';
  const { area } = handle;
  const resize = (ratio: number) =>
    api.dispatch({ type: 'resize-split', tabId, splitId: handle.id, ratio: clampRatio(ratio) });

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const box = event.currentTarget.parentElement?.getBoundingClientRect();
    if (box === undefined || box.width === 0 || box.height === 0) return;
    const ratio = row
      ? ((event.clientX - box.left) / box.width - area.x) / area.w
      : ((event.clientY - box.top) / box.height - area.y) / area.h;
    resize(ratio);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const back = row ? 'ArrowLeft' : 'ArrowUp';
    const forward = row ? 'ArrowRight' : 'ArrowDown';
    if (event.key !== back && event.key !== forward) return;
    event.preventDefault();
    resize(handle.ratio + (event.key === forward ? KEY_STEP : -KEY_STEP));
  };

  const style = row
    ? {
        left: percent(area.x + area.w * handle.ratio),
        top: percent(area.y),
        height: percent(area.h),
      }
    : {
        top: percent(area.y + area.h * handle.ratio),
        left: percent(area.x),
        width: percent(area.w),
      };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable window splitter (APG), not a thematic break
    <div
      role="separator"
      tabIndex={0}
      aria-label={row ? 'Resize the panes side by side' : 'Resize the stacked panes'}
      aria-orientation={row ? 'vertical' : 'horizontal'}
      aria-valuenow={Math.round(handle.ratio * 100)}
      aria-valuemin={10}
      aria-valuemax={90}
      data-dragging={dragging ? '' : undefined}
      style={style}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onDoubleClick={() => resize(0.5)}
      onKeyDown={onKeyDown}
      className={cn(
        'group/divider focus-ring-inset absolute z-raised',
        row ? 'w-2 -translate-x-1/2 cursor-col-resize' : 'h-2 -translate-y-1/2 cursor-row-resize',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute bg-border transition-colors duration-fast ease-standard',
          'group-hover/divider:bg-accent group-focus-visible/divider:bg-accent group-data-dragging/divider:bg-accent',
          row ? 'inset-y-0 left-1/2 w-px' : 'inset-x-0 top-1/2 h-px',
        )}
      />
    </div>
  );
}
