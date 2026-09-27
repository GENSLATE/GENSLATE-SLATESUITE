import { cn } from '@genslate/design-system';
import { useState } from 'react';

import { useLauncher } from '../../app/launcher.context';
import type { AppEntry } from '../../ipc/launcher.types';

export interface AppIconProps {
  readonly app: AppEntry;
  /** `sm` 16px menu row · `md` 28px list tile · `lg` 56px properties header. @default 'md' */
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

/**
 * The app's icon, served by id through `launcher-icon://` (GENSLATE icon family, PortableApps
 * PNGs, icons extracted from portapps executables). Falls back to a monogram tile.
 */
export function AppIcon({ app, size = 'md', className }: AppIconProps) {
  const { backend } = useLauncher();
  const [failed, setFailed] = useState(false);
  const src = app.hasIcon && !failed ? backend.iconUrl(app.id) : '';
  const dimmed = app.status === 'not-installed' || app.status === 'broken-manifest';
  const box = size === 'lg' ? 'size-14' : size === 'sm' ? 'size-4' : 'size-launcher-tile';

  if (src !== '') {
    return (
      <img
        data-slot="app-icon"
        src={src}
        alt=""
        draggable={false}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn(box, 'shrink-0 object-contain', dimmed && 'opacity-55 grayscale', className)}
      />
    );
  }
  return (
    <span
      data-slot="app-icon"
      aria-hidden
      className={cn(
        box,
        'grid shrink-0 place-items-center rounded-md bg-accent-subtle font-semibold text-accent-fg',
        size === 'lg' ? 'rounded-xl text-xl' : size === 'sm' ? 'rounded-sm text-xs' : 'text-sm',
        dimmed && 'opacity-55',
        className,
      )}
    >
      {size === 'sm' ? monogram(app.name).charAt(0) : monogram(app.name)}
    </span>
  );
}

/** "Mozilla Firefox" → "MF", "7-Zip" → "7Z". */
function monogram(name: string): string {
  const words = name.split(/[\s\-_]+/).filter((word) => word.length > 0);
  const letters = words.length > 1 ? [words[0], words[1]] : [name.slice(0, 2)];
  return letters
    .map((word) => word?.charAt(0) ?? '')
    .join('')
    .toUpperCase();
}
