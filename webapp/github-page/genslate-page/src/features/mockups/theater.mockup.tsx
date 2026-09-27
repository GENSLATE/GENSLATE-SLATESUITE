import { Icon } from '@genslate/design-system';

import { Artwork } from './mock-parts.component';
import { MockWindow } from './mock-stage.component';

const UP_NEXT = [
  { title: 'Aurora: Nights of the North', meta: '1:12:04 · 4K', seed: 5 },
  { title: 'The Long Fjord', meta: '48:30 · 1080p', seed: 1 },
  { title: 'Midnight Sun', meta: '1:31:12 · 4K', seed: 0 },
  { title: 'Kaamos — Part II', meta: '52:18 · 1080p', seed: 3 },
] as const;

const CHAPTERS = [0, 14, 31, 47, 62, 80] as const;

/** Theater: a cinema-dark player with chapters, scrubbing preview and an up-next list. */
export function TheaterMockup() {
  return (
    <MockWindow title="Northern Lights — A Winter Journey">
      <div className="flex min-w-0 flex-1 flex-col bg-film p-3">
        <div className="relative flex-1 overflow-hidden rounded-lg">
          <Artwork seed={2} sunX={14} className="absolute inset-0" />
          <div
            className="mock-pulse absolute inset-x-0 top-0 h-2/3 opacity-60 mix-blend-screen"
            style={{
              background:
                'radial-gradient(ellipse 60% 40% at 30% 30%, color-mix(in oklab, var(--gs-nord-14) 70%, transparent), transparent), radial-gradient(ellipse 50% 30% at 70% 20%, color-mix(in oklab, var(--gs-nord-15) 60%, transparent), transparent)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/75 to-transparent" />
          <p className="absolute inset-x-0 bottom-24 text-center font-medium text-[18px] text-white drop-shadow-md">
            “Up here, the winter night lasts for weeks.”
          </p>

          <div className="absolute inset-x-5 bottom-4 text-white">
            <div className="relative mb-3 h-1 rounded-full bg-white/25">
              <span className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-[var(--gs-nord-8)]" />
              {CHAPTERS.map((position) => (
                <span
                  key={position}
                  className="absolute top-0 h-1 w-0.5 bg-black/50"
                  style={{ left: `${position}%` }}
                />
              ))}
              <span className="absolute top-1/2 left-[38%] size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
              <div className="absolute bottom-4 left-[52%] -translate-x-1/2">
                <Artwork
                  seed={0}
                  sunX={40}
                  className="h-[72px] w-32 rounded-md ring-2 ring-white/80"
                />
                <p className="mt-1 text-center text-xs">Chapter 4 · The coast</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Icon name="codicon:debug-pause" size={20} />
              <Icon name="codicon:debug-step-back" size={16} />
              <Icon name="codicon:debug-step-over" size={16} />
              <Icon name="codicon:unmute" size={16} />
              <span className="text-sm tabular-nums">42:51 / 1:52:40</span>
              <span className="ml-auto flex items-center gap-4">
                <span className="rounded border border-white/60 px-1 font-semibold text-[10px]">
                  CC
                </span>
                <Icon name="codicon:list-unordered" size={16} />
                <Icon name="codicon:settings-gear" size={16} />
                <Icon name="codicon:screen-full" size={16} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="hairline-l flex w-[280px] shrink-0 flex-col gap-3 bg-surface-sidebar p-4">
        <p className="font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">Up next</p>
        {UP_NEXT.map((video) => (
          <div key={video.title} className="flex gap-3">
            <Artwork seed={video.seed} className="h-[54px] w-24 shrink-0 rounded-md" />
            <div className="min-w-0">
              <p className="line-clamp-2 font-medium text-fg-strong text-sm">{video.title}</p>
              <p className="text-fg-muted text-xs">{video.meta}</p>
            </div>
          </div>
        ))}
        <p className="mt-2 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
          Resume
        </p>
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-3">
          <p className="font-medium text-fg-strong text-sm">Continue on any PC</p>
          <p className="mt-1 text-fg-muted text-xs">
            Resume points travel with your GENSLATE-USB drive.
          </p>
        </div>
      </div>
    </MockWindow>
  );
}
