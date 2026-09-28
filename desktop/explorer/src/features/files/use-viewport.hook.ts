import { useRef, useState } from 'react';

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly scrollTop: number;
}

/**
 * Size and scroll position of a scroll container, for rendering only the visible rows.
 * `ref` goes on the scrolling element; `element()` reads it from event handlers and effects.
 */
export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0, scrollTop: 0 });
  const node = useRef<HTMLDivElement | null>(null);

  function ref(element: HTMLDivElement | null) {
    node.current = element;
    if (element === null) return;
    const update = () =>
      setViewport((current) =>
        current.width === element.clientWidth &&
        current.height === element.clientHeight &&
        current.scrollTop === element.scrollTop
          ? current
          : {
              width: element.clientWidth,
              height: element.clientHeight,
              scrollTop: element.scrollTop,
            },
      );
    update();
    element.addEventListener('scroll', update, { passive: true });
    // happy-dom (tests) and very old webviews have no ResizeObserver.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    return () => {
      element.removeEventListener('scroll', update);
      observer?.disconnect();
      node.current = null;
    };
  }

  return { viewport, ref, element: () => node.current };
}
