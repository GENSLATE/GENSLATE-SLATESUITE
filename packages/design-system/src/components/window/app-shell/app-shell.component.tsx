import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { useControllableState } from '../../../hooks/use-controllable-state.hook';
import { cn } from '../../../utils/cn.util';
import type { AppShellProps } from './app-shell.types';
import { appShellVariants } from './app-shell.variants';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface PersistedLayout {
  width?: number;
  collapsed?: boolean;
}

function readPersisted(key: string | undefined): PersistedLayout {
  if (!key) return {};
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    const { width, collapsed } = parsed as Record<string, unknown>;
    return {
      ...(typeof width === 'number' ? { width } : {}),
      ...(typeof collapsed === 'boolean' ? { collapsed } : {}),
    };
  } catch {
    return {};
  }
}

/**
 * The window layout: titlebar / [sidebar | main | inspector] / status bar.
 * The sidebar resizes with a VS Code sash (pointer drag or arrow keys; double-click resets;
 * dragging far below the minimum collapses it).
 */
export function AppShell({
  titleBar,
  statusBar,
  sidebar,
  inspector,
  inspectorWidth = 280,
  children,
  mainLabel,
  sidebarWidth,
  defaultSidebarWidth = 248,
  onSidebarWidthChange,
  sidebarMinWidth = 180,
  sidebarMaxWidth = 420,
  sidebarCollapsed,
  defaultSidebarCollapsed = false,
  onSidebarCollapsedChange,
  persistKey,
  labels,
  className,
  ...props
}: AppShellProps) {
  const [persisted] = useState(() => readPersisted(persistKey));
  const [width, setWidth] = useControllableState<number>({
    value: sidebarWidth,
    defaultValue: () =>
      clamp(persisted.width ?? defaultSidebarWidth, sidebarMinWidth, sidebarMaxWidth),
    onChange: onSidebarWidthChange,
  });
  const [collapsed, setCollapsed] = useControllableState<boolean>({
    value: sidebarCollapsed,
    defaultValue: () => persisted.collapsed ?? defaultSidebarCollapsed,
    onChange: onSidebarCollapsedChange,
  });

  useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(persistKey, JSON.stringify({ width, collapsed }));
    } catch {
      // Persistence is best-effort.
    }
  }, [persistKey, width, collapsed]);

  const sidebarId = useId();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startWidth: number; width: number; frame: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const styles = appShellVariants();

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startWidth: width, width, frame: 0 };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const raw = state.startWidth + (event.clientX - state.startX);
    state.width = clamp(raw, sidebarMinWidth, sidebarMaxWidth);
    // Dragging well past the minimum collapses the sidebar (VS Code behaviour).
    const wantsCollapse = raw < sidebarMinWidth / 2;
    cancelAnimationFrame(state.frame);
    state.frame = requestAnimationFrame(() => {
      const element = sidebarRef.current;
      if (!element) return;
      element.style.width = `${state.width}px`;
      element.toggleAttribute('data-collapsed', wantsCollapse);
    });
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    cancelAnimationFrame(state.frame);
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const raw = state.startWidth + (event.clientX - state.startX);
    if (raw < sidebarMinWidth / 2) {
      sidebarRef.current?.style.setProperty('width', `${width}px`);
      setCollapsed(true);
      return;
    }
    setWidth(state.width);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 8;
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = width - step;
    else if (event.key === 'ArrowRight') next = width + step;
    else if (event.key === 'Home') next = sidebarMinWidth;
    else if (event.key === 'End') next = sidebarMaxWidth;
    else if (event.key === 'Enter') {
      event.preventDefault();
      setCollapsed(true);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setWidth(clamp(next, sidebarMinWidth, sidebarMaxWidth));
  };

  const hasSidebar = sidebar != null;

  return (
    <div
      data-slot="app-shell"
      data-sidebar-collapsed={hasSidebar && collapsed ? '' : undefined}
      data-resizing={dragging ? '' : undefined}
      className={cn(styles.root(), className)}
      {...props}
    >
      {titleBar}
      <div data-slot="app-shell-body" className={styles.body()}>
        {hasSidebar && (
          <div
            ref={sidebarRef}
            id={sidebarId}
            data-slot="app-shell-sidebar"
            data-collapsed={collapsed ? '' : undefined}
            className={styles.sidebar()}
            style={{ width } as CSSProperties}
          >
            {sidebar}
            {/* biome-ignore lint/a11y/useSemanticElements: a focusable window splitter (APG), not a thematic break */}
            <div
              data-slot="app-shell-sash"
              data-dragging={dragging ? '' : undefined}
              role="separator"
              aria-orientation="vertical"
              aria-label={labels?.sash ?? 'Resize sidebar'}
              aria-controls={sidebarId}
              aria-valuenow={Math.round(width)}
              aria-valuemin={sidebarMinWidth}
              aria-valuemax={sidebarMaxWidth}
              tabIndex={0}
              className={styles.sash()}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onKeyDown}
              onDoubleClick={() =>
                setWidth(clamp(defaultSidebarWidth, sidebarMinWidth, sidebarMaxWidth))
              }
            >
              <span aria-hidden className={styles.sashLine()} />
            </div>
          </div>
        )}
        <main data-slot="app-shell-main" aria-label={mainLabel} className={styles.main()}>
          {children}
        </main>
        {inspector != null && (
          <aside
            data-slot="app-shell-inspector"
            className={styles.inspector()}
            style={{ width: inspectorWidth }}
          >
            {inspector}
          </aside>
        )}
      </div>
      {statusBar}
    </div>
  );
}
