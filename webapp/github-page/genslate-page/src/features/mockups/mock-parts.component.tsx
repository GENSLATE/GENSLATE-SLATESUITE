import { snippets } from 'virtual:genslate-snippets';
import { cn } from '@genslate/design-system';
import type { CSSProperties } from 'react';

/** Highlighted code from `content/snippets/<name>.<lang>.snippet` (tokenised at build time). */
export function CodeLines({
  name,
  lineNumbers = false,
  activeLine,
  className,
}: {
  readonly name: string;
  readonly lineNumbers?: boolean;
  /** 1-based line drawn with the current-line highlight. */
  readonly activeLine?: number;
  readonly className?: string;
}) {
  const lines = snippets[name] ?? [];
  return (
    <div className={cn('font-mono text-[12.5px] leading-[20px]', className)}>
      {lines.map((tokens, index) => {
        const line = index + 1;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static snippet lines never reorder
          <div
            key={index}
            className={cn(
              'flex whitespace-pre',
              line === activeLine && 'bg-fill-hover shadow-[inset_2px_0_0_var(--gs-color-accent)]',
            )}
          >
            {lineNumbers ? (
              <span
                className={cn(
                  'w-12 shrink-0 pr-4 text-right tabular-nums',
                  line === activeLine ? 'text-fg' : 'text-fg-disabled',
                )}
              >
                {line}
              </span>
            ) : null}
            <span style={{ color: 'var(--shiki-foreground)' }}>
              {tokens.map((token, tokenIndex) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: static snippet tokens never reorder
                  key={tokenIndex}
                  style={{
                    ...(token.color ? { color: token.color } : {}),
                    ...(token.italic ? { fontStyle: 'italic' } : {}),
                  }}
                >
                  {token.text}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type Nord = `--gs-nord-${number}` | `--gs-nord-${number}-${string}`;

interface ArtPalette {
  readonly skyTop: Nord;
  readonly skyBottom: Nord;
  readonly sun: Nord;
  readonly far: Nord;
  readonly near: Nord;
}

/** Nord "photographs": dusk, glacier, aurora, forest, desert, night. */
const PALETTES: readonly ArtPalette[] = [
  {
    skyTop: '--gs-nord-10',
    skyBottom: '--gs-nord-12',
    sun: '--gs-nord-13',
    far: '--gs-nord-3',
    near: '--gs-nord-1',
  },
  {
    skyTop: '--gs-nord-8',
    skyBottom: '--gs-nord-6',
    sun: '--gs-nord-6',
    far: '--gs-nord-9',
    near: '--gs-nord-10',
  },
  {
    skyTop: '--gs-nord-0',
    skyBottom: '--gs-nord-14',
    sun: '--gs-nord-7',
    far: '--gs-nord-2',
    near: '--gs-nord-0',
  },
  {
    skyTop: '--gs-nord-7',
    skyBottom: '--gs-nord-14',
    sun: '--gs-nord-6',
    far: '--gs-nord-14-d28',
    near: '--gs-nord-1',
  },
  {
    skyTop: '--gs-nord-12',
    skyBottom: '--gs-nord-13',
    sun: '--gs-nord-6',
    far: '--gs-nord-12',
    near: '--gs-nord-11',
  },
  {
    skyTop: '--gs-nord-1',
    skyBottom: '--gs-nord-15',
    sun: '--gs-nord-4',
    far: '--gs-nord-2',
    near: '--gs-nord-0',
  },
];

const RIDGES = [
  'polygon(0 72%, 18% 48%, 32% 62%, 52% 34%, 70% 58%, 86% 44%, 100% 60%, 100% 100%, 0 100%)',
  'polygon(0 64%, 22% 40%, 40% 56%, 58% 42%, 78% 66%, 100% 38%, 100% 100%, 0 100%)',
  'polygon(0 58%, 14% 66%, 36% 44%, 50% 60%, 68% 30%, 84% 52%, 100% 46%, 100% 100%, 0 100%)',
] as const;

/**
 * A generative Nord landscape (sky, sun, two mountain ridges) standing in for photos, album
 * covers and video frames — pure CSS, no image files.
 */
export function Artwork({
  seed,
  className,
  sunX = 68,
}: {
  readonly seed: number;
  readonly className?: string;
  readonly sunX?: number;
}) {
  const palette = PALETTES[seed % PALETTES.length] ?? PALETTES[0];
  if (!palette) return null;
  const v = (name: Nord) => `var(${name})`;
  const style = {
    background: `linear-gradient(180deg, ${v(palette.skyTop)}, ${v(palette.skyBottom)})`,
  } satisfies CSSProperties;
  return (
    <div className={cn('relative overflow-hidden', className)} style={style} aria-hidden="true">
      <div
        className="absolute size-[26%] rounded-full opacity-90 blur-[0.5px]"
        style={{
          left: `${(sunX + seed * 7) % 80}%`,
          top: `${18 + (seed % 3) * 8}%`,
          background: v(palette.sun),
          boxShadow: `0 0 40px 8px color-mix(in oklab, ${v(palette.sun)} 45%, transparent)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-80"
        style={{ background: v(palette.far), clipPath: RIDGES[seed % RIDGES.length] }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: v(palette.near),
          clipPath: RIDGES[(seed + 1) % RIDGES.length],
          translate: '0 18%',
        }}
      />
    </div>
  );
}

/** A codicon glyph in a Nord colour (file-type icons, folder icons). */
export function Glyph({
  name,
  color,
  size = 16,
  className,
}: {
  readonly name: string;
  readonly color?: Nord;
  readonly size?: number;
  readonly className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(`codicon codicon-${name} shrink-0`, className)}
      style={{ fontSize: size, ...(color ? { color: `var(${color})` } : {}) }}
    />
  );
}
