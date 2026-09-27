import { type CodiconRef, cn, Icon, Slider } from '@genslate/design-system';

import { Artwork } from './mock-parts.component';
import { MockWindow } from './mock-stage.component';

const LIBRARY: readonly { label: string; icon: CodiconRef; count: string }[] = [
  { label: 'All photos', icon: 'codicon:file-media', count: '1,284' },
  { label: 'Favorites', icon: 'codicon:heart', count: '86' },
  { label: 'Recent', icon: 'codicon:history', count: '42' },
];

const ALBUMS = ['Norway 2026', 'Iceland', 'Family', 'Wallpapers', 'Street'] as const;

// Justified rows: each photo's width follows its aspect ratio.
const ROWS: readonly (readonly { seed: number; ratio: number; fav?: boolean }[])[] = [
  [
    { seed: 2, ratio: 1.5 },
    { seed: 0, ratio: 0.8, fav: true },
    { seed: 1, ratio: 1.78 },
  ],
  [
    { seed: 3, ratio: 1.33 },
    { seed: 5, ratio: 1.5 },
    { seed: 4, ratio: 0.75 },
    { seed: 6, ratio: 1 },
  ],
  [
    { seed: 7, ratio: 1.78 },
    { seed: 8, ratio: 1.33, fav: true },
    { seed: 9, ratio: 1.2 },
  ],
];

/** Gallery: albums sidebar and a justified photo grid. */
export function GalleryMockup() {
  return (
    <MockWindow title="Norway 2026">
      <div className="hairline-r flex w-[208px] shrink-0 flex-col gap-4 bg-surface-sidebar px-2 pt-3">
        <div>
          <p className="mb-1 px-2 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
            Library
          </p>
          {LIBRARY.map((item) => (
            <div
              key={item.label}
              className="flex h-7 items-center gap-2 rounded-md px-2 text-fg text-md"
            >
              <Icon name={item.icon} size={16} className="text-fg-muted" />
              <span className="flex-1">{item.label}</span>
              <span className="text-fg-muted text-xs tabular-nums">{item.count}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-1 px-2 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
            Albums
          </p>
          {ALBUMS.map((album, index) => (
            <div
              key={album}
              className={cn(
                'flex h-9 items-center gap-2.5 rounded-md px-2 text-md',
                index === 0 ? 'bg-selection text-fg-strong' : 'text-fg',
              )}
            >
              <Artwork seed={index + 2} className="size-6 rounded-[5px]" />
              {album}
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-4 px-5">
          <div>
            <p className="font-semibold text-fg-strong text-xl">Norway 2026</p>
            <p className="text-fg-muted text-sm">14–17 February · 126 photos</p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-fg-muted">
            <Icon name="codicon:zoom-out" size={14} />
            <Slider aria-label="Zoom" defaultValue={60} className="w-28" />
            <Icon name="codicon:zoom-in" size={14} />
            <Icon name="codicon:play" size={16} className="ml-2" />
            <Icon name="codicon:export" size={16} />
          </div>
        </div>
        <div className="grid gap-2 px-5">
          {ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex h-[176px] gap-2">
              {row.map((photo) => (
                <div
                  key={photo.seed}
                  className="relative min-w-0 overflow-hidden rounded-md"
                  style={{ flexGrow: photo.ratio, flexBasis: 0 }}
                >
                  <Artwork seed={photo.seed} sunX={30 + photo.seed * 11} className="size-full" />
                  {photo.fav ? (
                    <Icon
                      name="codicon:heart-filled"
                      size={14}
                      className="absolute right-2 bottom-2 text-white drop-shadow"
                    />
                  ) : null}
                  {photo.seed === 1 ? (
                    <span className="absolute inset-0 rounded-md ring-[3px] ring-accent ring-inset" />
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </MockWindow>
  );
}
