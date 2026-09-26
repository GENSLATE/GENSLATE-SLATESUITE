/**
 * Resolves theme colour values into CSS and into opaque hex (for contrast checks, Rust and
 * native window backgrounds).
 */

import type {
  ColorValue,
  HexColor,
  ShadowLayer,
  TextPairKey,
  ThemeDefinition,
} from '../token.types';
import { PRIMITIVE_HEX } from '../tokens/color.tokens';
import { composite, parseHex, round } from './color.math';

export function primitiveHex(ref: string): HexColor {
  const hex = PRIMITIVE_HEX[ref];
  if (!hex) throw new Error(`Unknown primitive colour: ${ref}`);
  return hex;
}

/** CSS for a colour value. Opaque refs point at the primitive variable so they stay traceable. */
export function colorToCss(value: ColorValue): string {
  if (value === 'transparent') return 'transparent';
  if (!('alpha' in value)) {
    return value.ref === 'black' || value.ref === 'white' ? value.ref : `var(--gs-${value.ref})`;
  }
  const { r, g, b } = parseHex(primitiveHex(value.ref));
  return `rgb(${r} ${g} ${b} / ${round(value.alpha, 3)})`;
}

/** Opaque hex for a colour value, compositing translucency over `backgroundHex`. */
export function colorToHex(value: ColorValue, backgroundHex: HexColor): HexColor {
  if (value === 'transparent') return backgroundHex;
  const hex = primitiveHex(value.ref);
  return 'alpha' in value ? composite({ hex, alpha: value.alpha }, backgroundHex) : hex;
}

/** Looks up a semantic or chrome key in a theme. */
export function themeValue(theme: ThemeDefinition, key: TextPairKey): ColorValue {
  const record = { ...theme.color, ...theme.component } as Readonly<Record<string, ColorValue>>;
  const value = record[key];
  if (value === undefined) throw new Error(`Theme ${theme.id} has no colour "${key}"`);
  return value;
}

/** Opaque hex of the theme's canvas. */
export function canvasHex(theme: ThemeDefinition): HexColor {
  return colorToHex(theme.color.canvas, '#000000');
}

/** Opaque hex of any key, translucent values composited over the canvas. */
export function resolveHex(theme: ThemeDefinition, key: TextPairKey): HexColor {
  return colorToHex(themeValue(theme, key), canvasHex(theme));
}

export function shadowToCss(layers: readonly ShadowLayer[]): string {
  return layers
    .map((l) =>
      [
        l.inset ? 'inset' : '',
        `${l.x}px`,
        `${l.y}px`,
        `${l.blur}px`,
        `${l.spread}px`,
        colorToCss(l.color),
      ]
        .filter(Boolean)
        .join(' '),
    )
    .join(', ');
}
