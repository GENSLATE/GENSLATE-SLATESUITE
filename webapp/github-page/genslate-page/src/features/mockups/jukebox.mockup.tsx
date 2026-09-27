import { type CodiconRef, cn, Icon, Slider } from '@genslate/design-system';
import type { CSSProperties } from 'react';

import { Artwork } from './mock-parts.component';
import { MockWindow } from './mock-stage.component';

const LIBRARY: readonly { label: string; icon: CodiconRef; active?: boolean }[] = [
  { label: 'Albums', icon: 'codicon:library', active: true },
  { label: 'Artists', icon: 'codicon:person' },
  { label: 'Songs', icon: 'codicon:unmute' },
  { label: 'Genres', icon: 'codicon:tag' },
  { label: 'Folders', icon: 'codicon:folder' },
];

const PLAYLISTS = ['Late night drive', 'Deep focus', 'Sunday morning', 'Arctic ambient'] as const;

const ALBUMS = [
  { title: 'Polar Night', artist: 'Frost & Aurora', seed: 5 },
  { title: 'Snow Storm', artist: 'The Nord Collective', seed: 1 },
  { title: 'Midnight Sun', artist: 'Lofoten', seed: 0 },
  { title: 'Glacier', artist: 'Svalbard Sessions', seed: 2 },
  { title: 'Birch', artist: 'Kaamos', seed: 3 },
  { title: 'Salt', artist: 'Tromsø Radio', seed: 4 },
  { title: 'Fjord Lines', artist: 'Aurora Borealis', seed: 6 },
  { title: 'Ice Hotel', artist: 'Kiruna', seed: 7 },
] as const;

/** Jukebox: library sidebar, album grid and a now-playing bar with live meters. */
export function JukeboxMockup() {
  return (
    <MockWindow title="Jukebox">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <div className="hairline-r flex w-[208px] shrink-0 flex-col gap-4 bg-surface-sidebar px-2 pt-3">
            <div>
              <p className="mb-1 px-2 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
                Library
              </p>
              {LIBRARY.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'flex h-7 items-center gap-2 rounded-md px-2 text-md',
                    item.active ? 'bg-selection text-fg-strong' : 'text-fg',
                  )}
                >
                  <Icon
                    name={item.icon}
                    size={16}
                    className={item.active ? 'text-accent-fg' : 'text-fg-muted'}
                  />
                  {item.label}
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1 px-2 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
                Playlists
              </p>
              {PLAYLISTS.map((playlist) => (
                <div key={playlist} className="flex h-7 items-center gap-2 px-2 text-fg text-md">
                  <Icon name="codicon:list-ordered" size={16} className="text-fg-muted" />
                  {playlist}
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1 px-6 pt-5">
            <div className="flex items-end justify-between">
              <p className="font-semibold text-2xl text-fg-strong">Albums</p>
              <p className="text-fg-muted text-sm">
                248 albums · 3,102 songs · 214 GB on GENSLATE-USB
              </p>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-x-5 gap-y-4">
              {ALBUMS.map((album) => (
                <div key={album.title}>
                  <div className="relative">
                    <Artwork
                      seed={album.seed}
                      sunX={50}
                      className="aspect-square w-full rounded-lg shadow-card"
                    />
                    {album.seed === 5 ? (
                      <span className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-accent text-on-accent shadow-popover">
                        <Icon name="codicon:debug-pause" size={16} />
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate font-medium text-fg-strong text-md">{album.title}</p>
                  <p className="truncate text-fg-muted text-sm">{album.artist}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hairline-t flex h-[76px] shrink-0 items-center gap-6 bg-surface-raised px-5">
          <div className="flex w-[260px] items-center gap-3">
            <Artwork seed={5} sunX={50} className="size-12 rounded-md shadow-card" />
            <div className="min-w-0">
              <p className="truncate font-medium text-fg-strong text-md">Kaamos</p>
              <p className="truncate text-fg-muted text-sm">Frost & Aurora — Polar Night</p>
            </div>
            <Icon name="codicon:heart-filled" size={14} className="ml-1 text-danger-fg" />
          </div>
          <div className="flex flex-1 flex-col items-center gap-2">
            <div className="flex items-center gap-5 text-fg">
              <Icon name="codicon:arrow-swap" size={14} className="text-accent-fg" />
              <Icon name="codicon:debug-reverse-continue" size={16} />
              <span className="grid size-9 place-items-center rounded-full bg-fg-strong text-canvas">
                <Icon name="codicon:debug-pause" size={16} />
              </span>
              <Icon name="codicon:debug-continue" size={16} />
              <Icon name="codicon:sync" size={14} className="text-fg-muted" />
            </div>
            <div className="flex w-full max-w-[420px] items-center gap-2 text-fg-muted text-xs tabular-nums">
              <span>1:48</span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-track">
                <span className="mock-progress block h-full w-full rounded-full bg-accent" />
              </span>
              <span>4:32</span>
            </div>
          </div>
          <div className="flex w-[220px] items-center justify-end gap-3 text-fg-muted">
            <span className="flex h-5 items-end gap-[3px]" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="mock-eq-bar block h-full w-[3px] rounded-full bg-accent"
                  style={{ '--i': i } as CSSProperties}
                />
              ))}
            </span>
            <Icon name="codicon:unmute" size={16} />
            <Slider aria-label="Volume" defaultValue={70} className="w-24" />
          </div>
        </div>
      </div>
    </MockWindow>
  );
}
