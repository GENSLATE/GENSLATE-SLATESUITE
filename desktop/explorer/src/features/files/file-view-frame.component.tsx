import { cn } from '@genslate/design-system';
import type { ReactNode } from 'react';

import { useExplorer } from '../../app/explorer.context';
import { baseName } from '../../model/path.util';
import { useDropTarget } from './drag-drop.hook';
import type { FileLayout } from './file-layout.util';
import { marqueeBox, type useFileView } from './use-file-view.hook';

interface FileViewFrameProps {
  readonly scrollRef: (element: HTMLDivElement | null) => void;
  readonly view: ReturnType<typeof useFileView>;
  readonly layout: FileLayout;
  /** Height of everything that scrolls, header included. */
  readonly height: number;
  readonly headerHeight?: number;
  readonly header?: ReactNode;
  /** Shown over the empty background (an empty folder, no matches). */
  readonly overlay?: ReactNode;
  readonly children: ReactNode;
}

/**
 * The scrolling, focusable list every view shares: keyboard navigation (the items are
 * `aria-activedescendant` options), marquee selection on the background, and dropping into the
 * current folder.
 */
export function FileViewFrame({
  scrollRef,
  view,
  layout,
  height,
  headerHeight = 0,
  header,
  overlay,
  children,
}: FileViewFrameProps) {
  const api = useExplorer();
  const drop = useDropTarget(api.tab.search === null ? api.tab.path : null);
  const marquee = view.marquee === null ? null : marqueeBox(view.marquee);
  const name =
    api.tab.search === null ? baseName(api.tab.path) : `results for ${api.tab.search.text}`;

  return (
    <div
      ref={scrollRef}
      role="listbox"
      aria-multiselectable
      aria-label={`Contents of ${name}`}
      aria-orientation={layout.columns > 1 ? 'horizontal' : 'vertical'}
      aria-activedescendant={view.focusIndex >= 0 ? `explorer-item-${view.focusIndex}` : undefined}
      tabIndex={0}
      data-file-view
      data-context-zone="files"
      onKeyDown={view.onKeyDown}
      {...drop.handlers}
      className={cn(
        'group/view scrollbar-thin relative min-h-0 flex-1 select-none overflow-auto outline-none',
        drop.over && 'bg-accent-subtle/40',
      )}
    >
      {header}
      <div
        data-slot="file-view-content"
        {...view.backgroundHandlers}
        style={{ height: height - headerHeight, minHeight: `calc(100% - ${headerHeight}px)` }}
        className="relative"
      >
        {children}
        {overlay}
        {marquee === null ? null : (
          <div
            aria-hidden
            className="pointer-events-none absolute z-raised rounded-xs border border-accent-border bg-accent-subtle/60"
            style={{
              left: marquee.x,
              top: marquee.y - headerHeight,
              width: marquee.width,
              height: marquee.height,
            }}
          />
        )}
      </div>
    </div>
  );
}
