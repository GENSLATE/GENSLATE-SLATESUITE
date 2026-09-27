import { Icon } from '@genslate/design-system';
import { type CSSProperties, useState } from 'react';

import { AppMockup } from '../features/mockups/mockups.registry';

/**
 * The same live window in Polar Night and Snow Storm, split by a draggable divider. The divider
 * is a native range input (keyboard, touch and screen readers for free) laid over the picture.
 */
export function ThemeCompare({ app }: { readonly app: string }) {
  const [split, setSplit] = useState(50);
  const style = { '--split': `${split}%` } as CSSProperties;

  return (
    <div className="group relative select-none" style={style}>
      <AppMockup id={app} theme="polar-night" />
      <div aria-hidden="true" className="theme-split-top absolute inset-0">
        <AppMockup id={app} theme="snow-storm" />
      </div>

      <div
        aria-hidden="true"
        className="theme-split-handle pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-accent shadow-[0_0_0_1px_color-mix(in_oklab,var(--gs-color-canvas)_60%,transparent)]"
      >
        <span className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface-popover text-fg-strong shadow-popover outline-focus outline-offset-2 group-has-[input:focus-visible]:outline-2">
          <Icon name="codicon:arrow-both" size={16} />
        </span>
      </div>
      <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-surface-popover/90 px-3 py-1 font-medium text-fg-strong text-sm shadow-card backdrop-blur">
        Polar Night
      </span>
      <span className="pointer-events-none absolute right-4 bottom-4 rounded-full bg-surface-popover/90 px-3 py-1 font-medium text-fg-strong text-sm shadow-card backdrop-blur">
        Snow Storm
      </span>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={split}
        onChange={(event) => setSplit(Number(event.currentTarget.value))}
        aria-label="Compare Polar Night and Snow Storm"
        aria-valuetext={`${split}% Polar Night`}
        className="absolute inset-0 size-full cursor-ew-resize appearance-none bg-transparent opacity-0"
      />
    </div>
  );
}
