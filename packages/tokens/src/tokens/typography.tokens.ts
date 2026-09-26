/**
 * Typography: 13px macOS/VS Code base, Inter with optical tracking (SF Pro on macOS),
 * JetBrains Mono for code.
 */

import { round } from '../lib/color.math';
import type { TypeScaleKey, TypeStep, TypographyTokens } from '../token.types';

/**
 * Inter "dynamic metrics" tracking (rsms.me/inter/dynmetrics): tighter as text grows,
 * looser as it shrinks — the same optical sizing SF Pro applies natively.
 */
export function opticalTracking(sizePx: number): number {
  return round(-0.0223 + 0.185 * Math.exp(-0.1745 * sizePx), 4);
}

const step = (size: number, lineHeight: number): TypeStep => ({
  size,
  lineHeight,
  tracking: opticalTracking(size),
});

const SCALE: Record<TypeScaleKey, TypeStep> = {
  '2xs': step(10, 14),
  xs: step(11, 16),
  sm: step(12, 16),
  base: step(13, 18),
  md: step(14, 20),
  lg: step(16, 22),
  xl: step(20, 26),
  '2xl': step(24, 30),
  '3xl': step(30, 36),
};

export const TYPOGRAPHY: TypographyTokens = {
  family: {
    sans: [
      '"Inter Variable"',
      'Inter',
      'system-ui',
      '"Segoe UI Variable Text"',
      '"Segoe UI"',
      'Ubuntu',
      'sans-serif',
    ],
    sansMacos: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"SF Pro Text"',
      '"Inter Variable"',
      'system-ui',
      'sans-serif',
    ],
    mono: [
      '"JetBrains Mono Variable"',
      '"JetBrains Mono"',
      'ui-monospace',
      'SFMono-Regular',
      '"SF Mono"',
      'Menlo',
      'Consolas',
      'monospace',
    ],
  },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  leading: { none: 1, tight: 1.2, snug: 1.35, normal: 1.45, relaxed: 1.6 },
  scale: SCALE,
  code: { size: 12, lineHeight: 18, tracking: 0 },
  // cv11: single-storey a is off; ss03 round quotes; cv05 lower-case l with tail (legibility).
  features: ['calt', 'ss03', 'cv05'],
};
