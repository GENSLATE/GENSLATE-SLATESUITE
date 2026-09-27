import { cn, TitleBar } from '@genslate/design-system';
import type { CSSProperties, ReactNode } from 'react';

export interface MockStageProps {
  /** Logical window size in px; the stage scales it to its container's width. */
  readonly width: number;
  readonly height: number;
  /** What the picture shows, for assistive tech (the mockup itself is inert). */
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
  /** Pin a theme for this picture (theme compare); defaults to the page theme. */
  readonly theme?: 'polar-night' | 'snow-storm';
}

/**
 * A live, non-interactive app picture. Real design-system components render at a fixed window
 * size and are scaled with CSS (mockup.stage.css); `inert` keeps them out of the tab order and
 * the accessibility tree, and `data-play` runs their ambient animations only while on screen.
 */
export function MockStage({ width, height, label, children, className, theme }: MockStageProps) {
  const style = { '--mock-w-n': width, '--mock-h-n': height } as CSSProperties;
  return (
    <div role="img" aria-label={label} data-chrome className={cn('relative', className)}>
      <div data-play data-theme={theme} className="mock-stage bg-transparent" style={style}>
        <div className="mock-canvas" inert>
          {children}
        </div>
      </div>
    </div>
  );
}

export interface MockWindowProps {
  readonly title?: ReactNode;
  readonly leading?: ReactNode;
  readonly center?: ReactNode;
  readonly actions?: ReactNode;
  readonly statusBar?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  /** Hide the titlebar (apps that draw their own chrome, like the Launcher). */
  readonly bare?: boolean;
}

/** A GENSLATE window: custom titlebar with traffic lights, content, optional status bar. */
export function MockWindow({
  title,
  leading,
  center,
  actions,
  statusBar,
  children,
  className,
  bare = false,
}: MockWindowProps) {
  return (
    <div
      className={cn(
        'mock-window flex size-full flex-col overflow-hidden rounded-window bg-canvas text-fg',
        className,
      )}
    >
      {bare ? null : (
        <TitleBar
          platform="macos"
          isFocused
          title={title}
          leading={leading}
          center={center}
          actions={actions}
        />
      )}
      <div className="flex min-h-0 flex-1">{children}</div>
      {statusBar}
    </div>
  );
}
