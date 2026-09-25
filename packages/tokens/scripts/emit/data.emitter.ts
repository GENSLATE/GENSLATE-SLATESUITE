/**
 * Resolved-value outputs: TypeScript constants, JSON (DTCG-flavoured) and the contrast report.
 */

import { contrastRatio, round } from '../../src/lib/color.math';
import { colorToCss, resolveHex, shadowToCss } from '../../src/lib/theme.resolve';
import { CHROME_COLOR_KEYS, SEMANTIC_COLOR_KEYS } from '../../src/token.keys';
import { DERIVED, NORD } from '../../src/tokens/color.tokens';
import { LAYOUT_SIZE, RADIUS, SPACE, Z_INDEX } from '../../src/tokens/layout.tokens';
import { MOTION } from '../../src/tokens/motion.tokens';
import { TYPOGRAPHY } from '../../src/tokens/typography.tokens';
import type { HexColor, ThemeDefinition, ThemeId } from '../../src/token.types';
import { easingToCss, entries, tsBanner } from './emit.shared';

export interface ContrastResult {
  readonly theme: ThemeId;
  readonly fg: string;
  readonly bg: string;
  readonly fgHex: HexColor;
  readonly bgHex: HexColor;
  readonly ratio: number;
  readonly min: number;
  readonly pass: boolean;
}

export function checkContrast(themes: readonly ThemeDefinition[]): ContrastResult[] {
  return themes.flatMap((theme) =>
    theme.contrast.map(({ fg, bg, min }) => {
      // Translucent colours are composited over the canvas (see resolveHex).
      const bgHex = resolveHex(theme, bg);
      const fgHex = resolveHex(theme, fg);
      const ratio = round(contrastRatio(fgHex, bgHex), 2);
      return { theme: theme.id, fg, bg, fgHex, bgHex, ratio, min, pass: ratio >= min };
    }),
  );
}

function resolvedColors(theme: ThemeDefinition): Record<string, HexColor> {
  return Object.fromEntries(
    [...SEMANTIC_COLOR_KEYS, ...CHROME_COLOR_KEYS].map((k) => [k, resolveHex(theme, k)]),
  );
}

export function emitTokensTs(themes: readonly ThemeDefinition[]): string {
  const colors = Object.fromEntries(themes.map((t) => [t.id, resolvedColors(t)]));
  const meta = Object.fromEntries(themes.map((t) => [t.id, { name: t.name, scheme: t.scheme }]));
  const json = (v: unknown) => JSON.stringify(v, null, 2);
  return `${tsBanner()}
/** Resolved token values (translucent colours composited over each theme's canvas). */

export const THEME_META = ${json(meta)} as const;

export type GeneratedThemeId = keyof typeof THEME_META;

/** Opaque hex for every semantic and chrome colour, per theme — for canvas, charts and native code. */
export const THEME_COLORS = ${json(colors)} as const;

export const NORD_HEX = ${json(Object.fromEntries(entries(NORD).map(([k, v]) => [k, v.hex])))} as const;

export const LAYOUT_SIZE_PX = ${json(LAYOUT_SIZE)} as const;

export const RADIUS_PX = ${json(RADIUS.scale)} as const;

export const Z_INDEX = ${json(Z_INDEX)} as const;

export const DURATION_MS = ${json(MOTION.duration)} as const;

/** CSS variable name for any token, e.g. \`cssVar('color', 'accent')\` → \`var(--gs-color-accent)\`. */
export function cssVar(group: 'color' | 'size' | 'radius' | 'z' | 'duration' | 'ease' | 'shadow', key: string): string {
  return \`var(--gs-\${group}-\${key})\`;
}
`;
}

export function emitTokensJson(themes: readonly ThemeDefinition[]): string {
  const doc = {
    $description: 'GENSLATE design tokens (official Nord). Generated — edit packages/tokens/src.',
    primitive: {
      nord: Object.fromEntries(
        entries(NORD).map(([k, v]) => [k, { $type: 'color', $value: v.hex, group: v.group, $description: v.usage }]),
      ),
      derived: Object.fromEntries(
        entries(DERIVED).map(([k, v]) => [k, { $type: 'color', $value: v.hex, from: v.from, op: v.op, $description: v.reason }]),
      ),
    },
    theme: Object.fromEntries(
      themes.map((t) => [
        t.id,
        {
          name: t.name,
          scheme: t.scheme,
          color: Object.fromEntries(
            entries({ ...t.color, ...t.component }).map(([k, v]) => [
              k,
              { $type: 'color', $value: colorToCss(v), resolved: resolveHex(t, k) },
            ]),
          ),
          shadow: Object.fromEntries(entries(t.shadow).map(([k, v]) => [k, { $type: 'shadow', $value: shadowToCss(v) }])),
        },
      ]),
    ),
    typography: TYPOGRAPHY,
    space: SPACE,
    radius: RADIUS,
    zIndex: Z_INDEX,
    motion: {
      duration: MOTION.duration,
      easing: Object.fromEntries(entries(MOTION.easing).map(([k, v]) => [k, easingToCss(v)])),
      distance: MOTION.distance,
      scaleFrom: MOTION.scaleFrom,
    },
    size: LAYOUT_SIZE,
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export function emitContrastReport(results: readonly ContrastResult[]): string {
  return `${JSON.stringify({ passed: results.every((r) => r.pass), results }, null, 2)}\n`;
}
