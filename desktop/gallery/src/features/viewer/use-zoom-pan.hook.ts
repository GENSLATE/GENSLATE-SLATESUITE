import { type MouseEvent, type PointerEvent, useRef, useState, type WheelEvent } from 'react';

export interface ZoomState {
  /** 1 = fit to the stage. */
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

const FIT: ZoomState = { scale: 1, x: 0, y: 0 };
const MAX_SCALE = 8;

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(1, scale));
}

/**
 * Zoom and pan for the viewer's picture, as a CSS transform: the wheel zooms around the
 * pointer, double-click toggles fit and 2.5×, dragging pans while zoomed. `reset` goes back
 * to fit (on a new photo).
 */
export function useZoomPan() {
  const [zoom, setZoom] = useState<ZoomState>(FIT);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  /** Zooms to `scale` keeping the point `(px, py)` (relative to the stage centre) still. */
  const zoomAt = (scale: number, px: number, py: number) =>
    setZoom((current) => {
      const next = clampScale(scale);
      if (next === 1) return FIT;
      const ratio = next / current.scale;
      return { scale: next, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
    });

  const centreOffset = (event: { clientX: number; clientY: number; currentTarget: Element }) => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      px: event.clientX - box.left - box.width / 2,
      py: event.clientY - box.top - box.height / 2,
    };
  };

  return {
    zoom,
    zoomed: zoom.scale > 1,
    reset: () => setZoom(FIT),
    zoomBy(factor: number) {
      zoomAt(zoom.scale * factor, 0, 0);
    },
    handlers: {
      onWheel(event: WheelEvent<HTMLElement>) {
        const { px, py } = centreOffset(event);
        zoomAt(zoom.scale * Math.exp(-event.deltaY * 0.0025), px, py);
      },
      onDoubleClick(event: MouseEvent<HTMLElement>) {
        const { px, py } = centreOffset(event);
        zoomAt(zoom.scale > 1 ? 1 : 2.5, px, py);
      },
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (zoom.scale <= 1 || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: zoom.x, y: zoom.y, startX: event.clientX, startY: event.clientY };
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const start = drag.current;
        if (start === null) return;
        setZoom((current) => ({
          ...current,
          x: start.x + event.clientX - start.startX,
          y: start.y + event.clientY - start.startY,
        }));
      },
      onPointerUp() {
        drag.current = null;
      },
    },
    style: {
      transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
    },
  };
}
