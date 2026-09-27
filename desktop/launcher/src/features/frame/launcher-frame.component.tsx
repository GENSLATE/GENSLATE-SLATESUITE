import { cn } from '@genslate/design-system';
import type { ReactNode } from 'react';

import { useLauncher } from '../../app/launcher.context';

export interface LauncherFrameProps {
  /** The tools view is open: the frame and the well widen to the left. */
  readonly expanded: boolean;
  readonly titleBar: ReactNode;
  /** The recessed apps / tools panel. */
  readonly well: ReactNode;
  /** The documents rail on the right. */
  readonly rail: ReactNode;
  /** Search + slash bar, under the well. */
  readonly commandBar: ReactNode;
  /** Under the rail, level with the command bar (the Tools button). */
  readonly railFooter: ReactNode;
  readonly statusBar: ReactNode;
}

/**
 * The "bezel": titlebar, rail, command band and status bar are one continuous flat surface
 * wrapped around the recessed well. The DOM is always expanded-width; `.launcher-clip`
 * shows only the right part until the tools open (see styles/main.css).
 */
export function LauncherFrame({
  expanded,
  titleBar,
  well,
  rail,
  commandBar,
  railFooter,
  statusBar,
}: LauncherFrameProps) {
  const { stage } = useLauncher();
  return (
    <div
      data-slot="launcher-window"
      data-expanded={expanded || undefined}
      className="flex h-full select-none justify-end p-(--launcher-inset)"
    >
      <div
        data-slot="launcher-stage"
        data-state={stage}
        className="launcher-stage launcher-shadow h-full w-(--launcher-expanded) shrink-0"
      >
        <div
          data-slot="launcher-frame"
          className={cn(
            'launcher-clip grid h-full bg-surface-raised text-fg',
            'grid-cols-[minmax(0,1fr)_var(--spacing-launcher-rail)]',
            'grid-rows-[var(--spacing-launcher-titlebar)_minmax(0,1fr)_var(--spacing-launcher-band)_var(--spacing-launcher-status)]',
          )}
        >
          <div className="col-span-2 min-w-0">{titleBar}</div>
          <div className="relative min-h-0 min-w-0">{well}</div>
          <div className="min-h-0 min-w-0">{rail}</div>
          <div className="relative min-w-0">{commandBar}</div>
          <div className="min-w-0">{railFooter}</div>
          <div className="col-span-2 min-w-0">{statusBar}</div>
        </div>
      </div>
    </div>
  );
}
