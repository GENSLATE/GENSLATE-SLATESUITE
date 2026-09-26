/**
 * @genslate/tokens — the typed source of every GENSLATE design token.
 * Most consumers want the generated outputs instead:
 *  - CSS / Tailwind theme: `@genslate/tokens/tailwind.css`, `@genslate/tokens/css/*`
 *  - resolved values in TS: `@genslate/tokens/generated`
 */
import { polarNight } from './themes/nord.polar-night.theme';
import { snowStorm } from './themes/nord.snow-storm.theme';
import type { ThemeDefinition, ThemeId } from './token.types';

export * from './lib/color.math';
export * from './lib/theme.resolve';
export * from './token.keys';
export type * from './token.types';
export { DERIVED, NORD, PRIMITIVE_HEX } from './tokens/color.tokens';
export { LAYOUT_SIZE, RADIUS, SPACE, Z_INDEX } from './tokens/layout.tokens';
export { MOTION, springStops } from './tokens/motion.tokens';
export { opticalTracking, TYPOGRAPHY } from './tokens/typography.tokens';
export { polarNight, snowStorm };

/** Every theme, keyed by id. Polar Night is the default. */
export const THEMES: Readonly<Record<ThemeId, ThemeDefinition>> = {
  'polar-night': polarNight,
  'snow-storm': snowStorm,
};

export const THEME_IDS = ['polar-night', 'snow-storm'] as const satisfies readonly ThemeId[];
export const DEFAULT_THEME: ThemeId = 'polar-night';
