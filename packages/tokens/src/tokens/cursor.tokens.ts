/**
 * The GENSLATE cursor family: 32×32 SVG glyphs painted with each theme's cursor colours.
 *
 * Every glyph is a solid shape with a uniform rim (drawn as a thick stroke underneath the fill)
 * and a soft drop shadow, so it stays legible on any surface. The CSS emitter turns each one into
 * `--gs-cursor-{key}: url(…) x y, <keyword>`, keeping the native keyword as the fallback.
 */

import { primitiveHex } from '../lib/theme.resolve';
import type { CursorKey, CursorPaintKey, HexColor, ThemeDefinition } from '../token.types';

type Paint = Readonly<Record<CursorPaintKey, HexColor>> & { readonly shadow: number };

interface CursorGlyph {
  /** Hotspot in the 32×32 image, in whole CSS pixels. */
  readonly hotspot: readonly [number, number];
  /** Native keyword used when the image can't load, and by `[data-cursor="system"]`. */
  readonly fallback: string;
  /** The glyph's SVG content (inside the shadowed group). */
  readonly draw: (p: Paint) => string;
}

// ─── Geometry ─────────────────────────────────────────────────────────

const ARROW = 'M7 4.5V22.2l4.4-4.2 3.1 7.1 3.2-1.4-3.1-7h6.2z';
const ARROW_TIP = [7, 4] as const;
const CENTER = [16, 16] as const;

const HAND_POINT = [
  'M11.5 5.5a2 2 0 0 1 4 0V15h-4z',
  'M15.5 12a2 2 0 0 1 4 0v4h-4z',
  'M19.5 13a2 2 0 0 1 4 0v4h-4z',
  'M23.5 14.5a1.8 1.8 0 0 1 3.6 0V19h-3.6z',
  'M11.5 14.5h15.6V21c0 4-3 7-7 7h-2.4c-2.3 0-4-1-5.3-2.8l-4.7-6.6a1.9 1.9 0 0 1 2.9-2.4l.9 1z',
];
const HAND_POINT_SEAMS = 'M15.5 12.8v4M19.5 13.8v4M23.5 15.2v4';

const HAND_OPEN = [
  'M9.5 9a2 2 0 0 1 4 0v8h-4z',
  'M13.5 6.5a2 2 0 0 1 4 0V16h-4z',
  'M17.5 7.5a2 2 0 0 1 4 0V16h-4z',
  'M21.5 10a1.9 1.9 0 0 1 3.8 0V17h-3.8z',
  'M9.5 15h15.8V20.5c0 4.2-3 7.5-7.2 7.5h-2.3c-2.3 0-4-1-5.3-2.8l-4.4-6a1.9 1.9 0 0 1 2.9-2.4l.5.6z',
];
const HAND_OPEN_SEAMS = 'M13.5 9.5v7.5M17.5 8.5v8M21.5 10.5v7';

const HAND_FIST = [
  'M10 14a2 2 0 0 1 4 0v3h-4z',
  'M14 12.8a2 2 0 0 1 4 0V17h-4z',
  'M18 13.2a2 2 0 0 1 4 0V17h-4z',
  'M22 14.5a1.9 1.9 0 0 1 3.8 0V18h-3.8z',
  'M10 16h15.8v4.5c0 4.2-3 7.5-7.2 7.5h-2.3c-3.4 0-6.3-2.8-6.3-6.3z',
];
const HAND_FIST_SEAMS = 'M14 13.5v4M18 13.5v4M22 14.8v4';

const I_BEAM =
  'M12.5 7c2.3 0 3.5.8 3.5 2.6v12.8c0 1.8-1.2 2.6-3.5 2.6M19.5 7c-2.3 0-3.5.8-3.5 2.6v12.8c0 1.8 1.2 2.6 3.5 2.6M13.5 16h5';
const DOUBLE_ARROW = 'M6 16h20M9.5 12.5 6 16l3.5 3.5M22.5 12.5 26 16l-3.5 3.5';
const FOUR_WAY =
  'M16 5v22M5 16h22M12.5 8.5 16 5l3.5 3.5M12.5 23.5 16 27l3.5-3.5M8.5 12.5 5 16l3.5 3.5M23.5 12.5 27 16l-3.5 3.5';

// ─── Drawing primitives ───────────────────────────────────────────────

/** Filled shapes with a uniform rim: the rim is a stroke under the fill, so unions stay seamless. */
function solid(paths: readonly string[], fill: HexColor, p: Paint): string {
  const rim = paths
    .map(
      (d) =>
        `<path d="${d}" fill="${p.rim}" stroke="${p.rim}" stroke-width="3" stroke-linejoin="round"/>`,
    )
    .join('');
  return rim + paths.map((d) => `<path d="${d}" fill="${fill}"/>`).join('');
}

/** A stroked line glyph with a rim. */
function line(d: string, p: Paint, width = 2): string {
  const stroke = (color: HexColor, w: number) =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return stroke(p.rim, width + 3) + stroke(p.glyph, width);
}

/** Finger separations on the hands. */
const seams = (d: string, p: Paint) =>
  `<path d="${d}" stroke="${p.rim}" stroke-width="1" stroke-linecap="round" opacity=".55"/>`;

/** The arrow with a status badge at its lower right. */
function arrowWithBadge(p: Paint, fill: HexColor, glyph: string): string {
  return `${solid([ARROW], p.glyph, p)}<circle cx="23" cy="23" r="6.5" fill="${fill}" stroke="${p.rim}" stroke-width="1.5"/>${glyph}`;
}

const rotate = (deg: number, inner: string) => `<g transform="rotate(${deg} 16 16)">${inner}</g>`;

const notAllowedBadge = (p: Paint) =>
  arrowWithBadge(
    p,
    p.danger,
    '<circle cx="23" cy="23" r="3.3" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M20.7 25.3l4.6-4.6" stroke="#fff" stroke-width="1.5"/>',
  );

const moveGlyph = (p: Paint) => line(FOUR_WAY, p);

function zoom(p: Paint, plus: boolean): string {
  const sign = plus ? 'M10.5 13.5h6M13.5 10.5v6' : 'M10.5 13.5h6';
  return (
    line('M19 19l7 7', p, 3) +
    `<circle cx="13.5" cy="13.5" r="7" fill="none" stroke="${p.rim}" stroke-width="5"/>` +
    `<circle cx="13.5" cy="13.5" r="7" fill="none" stroke="${p.glyph}" stroke-width="2"/>` +
    `<path d="${sign}" stroke="${p.accent}" stroke-width="2" stroke-linecap="round"/>`
  );
}

// ─── The family ───────────────────────────────────────────────────────

export const CURSORS: Readonly<Record<CursorKey, CursorGlyph>> = {
  default: { hotspot: ARROW_TIP, fallback: 'default', draw: (p) => solid([ARROW], p.glyph, p) },
  interactive: {
    hotspot: ARROW_TIP,
    fallback: 'default',
    // A glyph-coloured edge inside the rim keeps the Frost fill readable on accent surfaces.
    draw: (p) =>
      `<path d="${ARROW}" fill="${p.rim}" stroke="${p.rim}" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="${ARROW}" fill="${p.accent}" stroke="${p.glyph}" stroke-width="1.4" stroke-linejoin="round"/>`,
  },
  pointer: {
    hotspot: [13, 4],
    fallback: 'pointer',
    draw: (p) => solid(HAND_POINT, p.glyph, p) + seams(HAND_POINT_SEAMS, p),
  },
  text: { hotspot: CENTER, fallback: 'text', draw: (p) => line(I_BEAM, p, 1.6) },
  'vertical-text': {
    hotspot: CENTER,
    fallback: 'vertical-text',
    draw: (p) => rotate(90, line(I_BEAM, p, 1.6)),
  },
  'not-allowed': { hotspot: ARROW_TIP, fallback: 'not-allowed', draw: notAllowedBadge },
  'no-drop': { hotspot: ARROW_TIP, fallback: 'no-drop', draw: notAllowedBadge },
  progress: {
    hotspot: ARROW_TIP,
    fallback: 'progress',
    draw: (p) =>
      arrowWithBadge(
        p,
        p.rim,
        `<circle cx="23" cy="23" r="3.6" fill="none" stroke="${p.accent}" stroke-opacity=".3" stroke-width="2"/><path d="M23 19.4a3.6 3.6 0 0 1 3.6 3.6" fill="none" stroke="${p.accent}" stroke-width="2" stroke-linecap="round"/>`,
      ),
  },
  wait: {
    hotspot: CENTER,
    fallback: 'wait',
    draw: (p) =>
      `<circle cx="16" cy="16" r="8" fill="${p.rim}" stroke="${p.rim}" stroke-width="3"/><circle cx="16" cy="16" r="5.5" fill="none" stroke="${p.accent}" stroke-opacity=".3" stroke-width="2.5"/><path d="M16 10.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  help: {
    hotspot: ARROW_TIP,
    fallback: 'help',
    draw: (p) =>
      arrowWithBadge(
        p,
        p.info,
        '<path d="M21.3 21.4a1.8 1.8 0 1 1 2.6 1.6c-.6.3-.9.7-.9 1.3" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><circle cx="23" cy="26.3" r=".9" fill="#fff"/>',
      ),
  },
  copy: {
    hotspot: ARROW_TIP,
    fallback: 'copy',
    draw: (p) =>
      arrowWithBadge(
        p,
        p.success,
        `<path d="M23 19.8v6.4M19.8 23h6.4" stroke="${p.rim}" stroke-width="1.8" stroke-linecap="round"/>`,
      ),
  },
  alias: {
    hotspot: ARROW_TIP,
    fallback: 'alias',
    draw: (p) =>
      arrowWithBadge(
        p,
        p.accent,
        `<path d="M20.6 25.4c0-2.8 1.6-4.3 4.6-4.3M23.3 19.3l1.9 1.8-1.9 1.8" fill="none" stroke="${p['on-accent']}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
      ),
  },
  'context-menu': {
    hotspot: ARROW_TIP,
    fallback: 'context-menu',
    draw: (p) =>
      arrowWithBadge(
        p,
        p.glyph,
        `<path d="M20.3 20.8h5.4M20.3 23h5.4M20.3 25.2h5.4" stroke="${p.rim}" stroke-width="1.3" stroke-linecap="round"/>`,
      ),
  },
  grab: {
    hotspot: [17, 16],
    fallback: 'grab',
    draw: (p) => solid(HAND_OPEN, p.glyph, p) + seams(HAND_OPEN_SEAMS, p),
  },
  grabbing: {
    hotspot: [17, 18],
    fallback: 'grabbing',
    draw: (p) => solid(HAND_FIST, p.glyph, p) + seams(HAND_FIST_SEAMS, p),
  },
  move: { hotspot: CENTER, fallback: 'move', draw: moveGlyph },
  'all-scroll': { hotspot: CENTER, fallback: 'all-scroll', draw: moveGlyph },
  crosshair: {
    hotspot: CENTER,
    fallback: 'crosshair',
    draw: (p) =>
      line('M16 5v7M16 20v7M5 16h7M20 16h7', p, 1.6) +
      `<circle cx="16" cy="16" r="2" fill="${p.accent}" stroke="${p.rim}" stroke-width="1.2"/>`,
  },
  'col-resize': {
    hotspot: CENTER,
    fallback: 'col-resize',
    draw: (p) =>
      line('M5 16h8M19 16h8M8.5 12.5 5 16l3.5 3.5M23.5 12.5 27 16l-3.5 3.5M14.5 8v16M17.5 8v16', p),
  },
  'row-resize': {
    hotspot: CENTER,
    fallback: 'row-resize',
    draw: (p) =>
      line('M16 5v8M16 19v8M12.5 8.5 16 5l3.5 3.5M12.5 23.5 16 27l3.5-3.5M8 14.5h16M8 17.5h16', p),
  },
  'ew-resize': { hotspot: CENTER, fallback: 'ew-resize', draw: (p) => line(DOUBLE_ARROW, p) },
  'ns-resize': {
    hotspot: CENTER,
    fallback: 'ns-resize',
    draw: (p) => rotate(90, line(DOUBLE_ARROW, p)),
  },
  'nwse-resize': {
    hotspot: CENTER,
    fallback: 'nwse-resize',
    draw: (p) => rotate(45, line(DOUBLE_ARROW, p)),
  },
  'nesw-resize': {
    hotspot: CENTER,
    fallback: 'nesw-resize',
    draw: (p) => rotate(-45, line(DOUBLE_ARROW, p)),
  },
  'zoom-in': { hotspot: [13, 13], fallback: 'zoom-in', draw: (p) => zoom(p, true) },
  'zoom-out': { hotspot: [13, 13], fallback: 'zoom-out', draw: (p) => zoom(p, false) },
};

// ─── Output ───────────────────────────────────────────────────────────

function paintOf(theme: ThemeDefinition): Paint {
  const { color, shadow } = theme.cursor;
  const hex = Object.fromEntries(
    Object.entries(color).map(([k, ref]) => [k, primitiveHex(ref)]),
  ) as Record<CursorPaintKey, HexColor>;
  return { ...hex, shadow };
}

/** The cursor as a standalone SVG document in `theme`'s colours. */
export function cursorSvg(key: CursorKey, theme: ThemeDefinition): string {
  const p = paintOf(theme);
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
    `<defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dy="1" stdDeviation=".9" flood-opacity="${p.shadow}"/></filter></defs>` +
    `<g filter="url(#s)">${CURSORS[key].draw(p)}</g></svg>`
  );
}

/** A compact `data:` URI (only the characters CSS and URLs need escaped). */
export function cursorDataUri(key: CursorKey, theme: ThemeDefinition): string {
  const body = cursorSvg(key, theme)
    .replaceAll('"', "'")
    .replaceAll('%', '%25')
    .replaceAll('#', '%23')
    .replaceAll('<', '%3C')
    .replaceAll('>', '%3E');
  return `data:image/svg+xml,${body}`;
}

/** The CSS `cursor` value: the themed image at its hotspot, then the native keyword. */
export function cursorCss(key: CursorKey, theme: ThemeDefinition): string {
  const { hotspot, fallback } = CURSORS[key];
  return `url("${cursorDataUri(key, theme)}") ${hotspot[0]} ${hotspot[1]}, ${fallback}`;
}
