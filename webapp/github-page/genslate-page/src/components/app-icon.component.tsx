import { cn } from '@genslate/design-system';
import type { CSSProperties } from 'react';

import { appIconUrl } from '../content/app-icons.content';
import type { SuiteApp } from '../content/apps.content';

export interface AppIconProps {
  readonly app: Pick<SuiteApp, 'id' | 'name' | 'color'>;
  /** Rendered size in px. */
  readonly size: number;
  /**
   * `plate`: crop to the icon plate (list tiles, small sizes) ·
   * `full`: the whole 1024 canvas with the macOS grid margin and drop shadow (hero, dock).
   * @default 'plate'
   */
  readonly frame?: 'plate' | 'full';
  /** Morph between pages (unique per page). */
  readonly transitionName?: string;
  readonly className?: string;
}

/** An app's icon from the GENSLATE icon family; a Nord monogram tile if it has none. */
export function AppIcon({ app, size, frame = 'plate', transitionName, className }: AppIconProps) {
  const url = appIconUrl(app.id);
  const style: CSSProperties = {
    width: size,
    height: size,
    ...(transitionName ? { viewTransitionName: transitionName } : {}),
  };

  if (url === undefined) {
    return (
      <span
        aria-hidden="true"
        data-nord={app.color}
        style={style}
        className={cn(
          'grid shrink-0 place-items-center rounded-[22.5%] bg-(--app-color) font-semibold text-fg-strong',
          className,
        )}
      >
        {app.name.slice(0, 1)}
      </span>
    );
  }

  if (frame === 'full') {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        draggable={false}
        decoding="async"
        style={style}
        className={cn('shrink-0 select-none', className)}
      />
    );
  }

  // The plate spans 824 of 1024 units: scale by 1024 / 824 and clip to its 22.45% radius.
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn('relative block shrink-0 overflow-hidden rounded-[22.45%]', className)}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        decoding="async"
        className="absolute top-1/2 left-1/2 size-[124.3%] max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
      />
    </span>
  );
}
