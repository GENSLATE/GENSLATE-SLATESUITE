import { cn } from '@genslate/design-system';
import { type PointerEvent, useState } from 'react';

import { formatMonthShort, formatMonthTitle } from '../../model/format.util';
import type { Layout } from '../../model/layout.util';

interface DateScrubberProps {
  readonly layout: Layout;
  readonly element: () => HTMLElement | null;
  readonly scrollTop: number;
  readonly height: number;
}

interface Mark {
  readonly top: number;
  readonly date: number;
  readonly year: boolean;
}

/**
 * The timeline's date rail: years (and months, when there is room) along the right edge.
 * Dragging or clicking scrolls to that date; hovering shows the month under the pointer.
 */
export function DateScrubber({ layout, element, scrollTop, height }: DateScrubberProps) {
  const [hover, setHover] = useState<{ y: number; label: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const total = Math.max(1, layout.height - height);
  if (layout.height <= height * 1.5) return null;

  // One mark per month; years get a label.
  const marks: Mark[] = [];
  let lastMonth = '';
  for (const block of layout.blocks) {
    if (block.type !== 'header') continue;
    const date = new Date(block.section.date);
    const month = `${date.getFullYear()}-${date.getMonth()}`;
    if (month === lastMonth) continue;
    const year =
      marks.at(-1) === undefined ||
      new Date(marks.at(-1)?.date ?? 0).getFullYear() !== date.getFullYear();
    marks.push({ top: Math.min(1, block.top / total), date: block.section.date, year });
    lastMonth = month;
  }

  const fractionAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (event.clientY - box.top) / Math.max(1, box.height)));
  };
  const labelAt = (fraction: number) => {
    let found = marks[0];
    for (const mark of marks) if (mark.top <= fraction) found = mark;
    return found === undefined ? '' : formatMonthTitle(found.date);
  };
  const scrollTo = (fraction: number) => {
    const target = element();
    if (target !== null) target.scrollTop = fraction * total;
  };

  return (
    // A pointer shortcut only: keyboard users scroll the list itself (arrows, Home, End).
    <div
      aria-hidden
      data-slot="date-scrubber"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        scrollTo(fractionAt(event));
      }}
      onPointerMove={(event) => {
        const fraction = fractionAt(event);
        setHover({ y: fraction, label: labelAt(fraction) });
        if (dragging) scrollTo(fraction);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setHover(null)}
      className="group/scrubber absolute top-2 right-1 bottom-4 w-7 cursor-row-resize select-none"
    >
      {marks.map((mark) => (
        <span
          key={mark.date}
          style={{ top: `${mark.top * 100}%` }}
          className={cn(
            'pointer-events-none absolute right-2.5 -translate-y-1/2 text-right tabular-nums',
            mark.year
              ? 'font-semibold text-2xs text-fg-secondary'
              : 'h-px w-1.5 bg-border-strong opacity-0 group-hover/scrubber:opacity-100',
          )}
          title={mark.year ? undefined : formatMonthShort(mark.date)}
        >
          {mark.year ? new Date(mark.date).getFullYear() : null}
        </span>
      ))}
      <span
        aria-hidden
        style={{ top: `${(scrollTop / total) * 100}%` }}
        className="pointer-events-none absolute right-0 h-4 w-1 -translate-y-1/2 rounded-full bg-accent"
      />
      {hover === null ? null : (
        <span
          aria-hidden
          style={{ top: `${hover.y * 100}%` }}
          className="pointer-events-none absolute right-8 z-popover -translate-y-1/2 whitespace-nowrap rounded-control bg-tooltip-bg px-2 py-0.5 text-tooltip-fg text-xs shadow-popover"
        >
          {hover.label}
        </span>
      )}
    </div>
  );
}
