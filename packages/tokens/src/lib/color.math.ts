/**
 * Pure, dependency-free colour maths for the token source, its tests and the generator.
 *
 * Spaces:
 *  - sRGB (gamma-encoded) channels 0–255 — `Rgb`
 *  - linear-light sRGB channels 0–1      — `LinearRgb`
 *  - OKLab / OKLCH (Björn Ottosson, 2020) — https://bottosson.github.io/posts/oklab/
 *
 * Conventions:
 *  - Hex strings are `#rrggbb`, emitted lower-case.
 *  - Channel quantisation rounds half-up, after stripping binary floating-point noise, so
 *    `mix('#d8dee9', '#2e3440', 0.85)` is exactly `#bfc5d0` on every platform.
 *  - `mix` and `composite` interpolate gamma-encoded sRGB, matching how browsers and
 *    WebViews blend `rgb(… / a)` layers and `color-mix(in srgb, …)`.
 *  - Luminance and contrast follow WCAG 2.x (sRGB transfer threshold 0.04045).
 */

import type { HexColor } from '../token.types';

// ─── Types ────────────────────────────────────────────────────────────

/** Gamma-encoded sRGB, each channel 0–255 (may be fractional before quantisation). */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Linear-light sRGB, each channel nominally 0–1 (out-of-gamut values fall outside). */
export interface LinearRgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** OKLab: `l` perceptual lightness 0–1, `a` green→red, `b` blue→yellow. */
export interface Oklab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

/** OKLCH: `l` lightness 0–1, `c` chroma ≥ 0, `h` hue in degrees [0, 360). */
export interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

/** A colour with opacity, as used for alpha compositing. */
export interface AlphaColor {
  readonly hex: HexColor;
  /** Opacity 0–1. */
  readonly alpha: number;
}

// ─── Numbers ──────────────────────────────────────────────────────────

/**
 * Rounds to `digits` decimals, half away from zero, after removing binary floating-point
 * noise (so `round(1.005, 2) === 1.01` and `round(190.49999999999997) === 191`).
 */
export function round(n: number, digits = 0): number {
  if (!Number.isFinite(n)) return n;
  if (!Number.isInteger(digits) || digits < 0 || digits > 15) {
    throw new RangeError(`round(): digits must be an integer 0–15, got ${digits}`);
  }
  const factor = 10 ** digits;
  // 15 significant digits is the precision a double round-trips exactly; beyond it is noise.
  const scaled = Number((Math.abs(n) * factor).toPrecision(15));
  const result = (Math.sign(n) * Math.round(scaled)) / factor;
  return result === 0 ? 0 : result; // normalise -0
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function assertUnitInterval(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be a finite number in [0, 1], got ${value}`);
  }
}

// ─── Hex ⇄ sRGB ───────────────────────────────────────────────────────

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parses `#rgb` or `#rrggbb` (any case) into 0–255 channels. Throws on anything else. */
export function parseHex(hex: string): Rgb {
  if (typeof hex !== 'string' || !HEX_PATTERN.test(hex)) {
    throw new TypeError(`Invalid hex colour: ${JSON.stringify(hex)} (expected #rgb or #rrggbb)`);
  }
  const digits = hex.length === 4 ? [...hex.slice(1)].map((d) => d + d).join('') : hex.slice(1);
  return {
    r: Number.parseInt(digits.slice(0, 2), 16),
    g: Number.parseInt(digits.slice(2, 4), 16),
    b: Number.parseInt(digits.slice(4, 6), 16),
  };
}

/** Quantises one 0–255 channel: round half-up, clamp to the byte range. */
function toByte(channel: number): number {
  if (Number.isNaN(channel)) throw new RangeError('Colour channel is NaN');
  return clamp(round(channel), 0, 255);
}

/** Formats 0–255 channels (fractional values are rounded half-up and clamped) as `#rrggbb`. */
export function toHex({ r, g, b }: Rgb): HexColor {
  const byte = (c: number) => toByte(c).toString(16).padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/** Normalises any accepted hex spelling to lower-case `#rrggbb`. */
export function normalizeHex(hex: string): HexColor {
  return toHex(parseHex(hex));
}

// ─── sRGB ⇄ linear ────────────────────────────────────────────────────

/** sRGB electro-optical transfer function for one 0–1 channel. */
function decodeChannel(c: number): number {
  const abs = Math.abs(c);
  const linear = abs <= 0.04045 ? abs / 12.92 : ((abs + 0.055) / 1.055) ** 2.4;
  return Math.sign(c) * linear;
}

/** Inverse sRGB transfer function for one linear channel. */
function encodeChannel(c: number): number {
  const abs = Math.abs(c);
  const encoded = abs <= 0.0031308 ? abs * 12.92 : 1.055 * abs ** (1 / 2.4) - 0.055;
  return Math.sign(c) * encoded;
}

/** Gamma-encoded sRGB (0–255) → linear-light sRGB (0–1). */
export function srgbToLinear({ r, g, b }: Rgb): LinearRgb {
  return {
    r: decodeChannel(r / 255),
    g: decodeChannel(g / 255),
    b: decodeChannel(b / 255),
  };
}

/** Linear-light sRGB (0–1) → gamma-encoded sRGB (0–255, unclamped, unrounded). */
export function linearToSrgb({ r, g, b }: LinearRgb): Rgb {
  return {
    r: encodeChannel(r) * 255,
    g: encodeChannel(g) * 255,
    b: encodeChannel(b) * 255,
  };
}

// ─── linear sRGB ⇄ OKLab (Ottosson's published matrices) ──────────────

/** Linear-light sRGB → OKLab. */
export function linearToOklab({ r, g, b }: LinearRgb): Oklab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** OKLab → linear-light sRGB (may be out of gamut). */
export function oklabToLinear({ l, a, b }: Oklab): LinearRgb {
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    g: -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    b: -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  };
}

// ─── OKLab ⇄ OKLCH ────────────────────────────────────────────────────

/** Chroma below this is treated as achromatic (hue is meaningless and reported as 0). */
const ACHROMATIC_EPSILON = 1e-7;

/** OKLab → OKLCH (hue in degrees, [0, 360)). */
export function oklabToOklch({ l, a, b }: Oklab): Oklch {
  const c = Math.hypot(a, b);
  if (c < ACHROMATIC_EPSILON) return { l, c: 0, h: 0 };
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c, h: h < 0 ? h + 360 : h };
}

/** OKLCH → OKLab. */
export function oklchToOklab({ l, c, h }: Oklch): Oklab {
  const rad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

// ─── Composite conversions ────────────────────────────────────────────

/** `#rrggbb` → OKLab. */
export function hexToOklab(hex: string): Oklab {
  return linearToOklab(srgbToLinear(parseHex(hex)));
}

/** `#rrggbb` → OKLCH. */
export function hexToOklch(hex: string): Oklch {
  return oklabToOklch(hexToOklab(hex));
}

/** Tolerance for gamut tests (linear channels), absorbing matrix round-off. */
const GAMUT_EPSILON = 1e-6;

/** True when the linear-light colour lies inside the sRGB cube. */
export function isInSrgbGamut({ r, g, b }: LinearRgb): boolean {
  const inside = (c: number) => c >= -GAMUT_EPSILON && c <= 1 + GAMUT_EPSILON;
  return inside(r) && inside(g) && inside(b);
}

/**
 * OKLCH → `#rrggbb`. Out-of-gamut colours are mapped into sRGB by reducing chroma at
 * constant lightness and hue (binary search), which preserves the perceived tone.
 */
export function oklchToHex(color: Oklch): HexColor {
  const l = clamp(color.l, 0, 1);
  const toLinear = (c: number) => oklabToLinear(oklchToOklab({ l, c, h: color.h }));

  let linear = toLinear(color.c);
  if (!isInSrgbGamut(linear)) {
    let lo = 0;
    let hi = color.c;
    // 32 halvings pin chroma far below one 8-bit step.
    for (let i = 0; i < 32; i += 1) {
      const mid = (lo + hi) / 2;
      if (isInSrgbGamut(toLinear(mid))) lo = mid;
      else hi = mid;
    }
    linear = toLinear(lo);
  }

  const clipped: LinearRgb = {
    r: clamp(linear.r, 0, 1),
    g: clamp(linear.g, 0, 1),
    b: clamp(linear.b, 0, 1),
  };
  return toHex(linearToSrgb(clipped));
}

// ─── Operations ───────────────────────────────────────────────────────

/**
 * Shifts OKLCH lightness by `deltaL` (positive = lighter, negative = darker), keeping
 * chroma and hue; the result is gamut-mapped to sRGB by reducing chroma.
 */
export function shiftLightness(hex: string, deltaL: number): HexColor {
  if (!Number.isFinite(deltaL) || Math.abs(deltaL) > 1) {
    throw new RangeError(`deltaL must be a finite number in [-1, 1], got ${deltaL}`);
  }
  const { l, c, h } = hexToOklch(hex);
  return oklchToHex({ l: clamp(l + deltaL, 0, 1), c, h });
}

/**
 * Linear interpolation of gamma-encoded sRGB channels: `weightOfA` of `hexA` plus
 * `1 − weightOfA` of `hexB` (equivalent to `color-mix(in srgb, A w%, B)`).
 */
export function mix(hexA: string, hexB: string, weightOfA: number): HexColor {
  assertUnitInterval('mix() weightOfA', weightOfA);
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  const lerp = (x: number, y: number) => x * weightOfA + y * (1 - weightOfA);
  return toHex({ r: lerp(a.r, b.r), g: lerp(a.g, b.g), b: lerp(a.b, b.b) });
}

/** Source-over alpha compositing of a translucent colour onto an opaque background. */
export function composite({ hex, alpha }: AlphaColor, backgroundHex: string): HexColor {
  assertUnitInterval('composite() alpha', alpha);
  return mix(hex, backgroundHex, alpha);
}

// ─── WCAG 2.x ─────────────────────────────────────────────────────────

/** WCAG 2.x relative luminance (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = srgbToLinear(parseHex(hex));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio (1–21), symmetric in its arguments. */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
