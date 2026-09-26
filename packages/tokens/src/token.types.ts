/**
 * GENSLATE design-token contract.
 *
 * Tiers (every CSS custom property is prefixed `--gs-`):
 *  - T0 primitives — official Nord palette + derived shades → `--gs-nord-8`, `--gs-nord-10-d08`
 *  - T0 scales     — typography, spacing, radius, motion, z-index, layout sizes
 *  - T1 semantic   — per-theme roles → `--gs-color-fg-muted`, `--gs-shadow-popover`
 *  - T2 component  — per-theme window-chrome roles → `--gs-titlebar-bg-inactive`
 *
 * Token keys are kebab-case strings so they map 1:1 onto CSS variable and Tailwind names.
 * Every `Record<Key, …>` below makes a missing or misspelled key a compile error.
 */

import type {
  CHROME_COLOR_KEYS,
  DERIVED_COLOR_KEYS,
  NORD_COLOR_KEYS,
  SEMANTIC_COLOR_KEYS,
  SHADOW_KEYS,
} from './token.keys';

// ─── Colour keys ──────────────────────────────────────────────────────

/** Official Nord palette: `nord-0` … `nord-15`. */
export type NordColorKey = (typeof NORD_COLOR_KEYS)[number];
/** Derived shades (OKLCH lightness shifts / mixes of Nord colours), e.g. `nord-10-d08`. */
export type DerivedColorKey = (typeof DERIVED_COLOR_KEYS)[number];
/** Anything a theme may reference. `black`/`white` exist for scrims and shadows. */
export type PrimitiveColorKey = NordColorKey | DerivedColorKey | 'black' | 'white';
/** T1 semantic colour roles (identical key set in every theme). */
export type SemanticColorKey = (typeof SEMANTIC_COLOR_KEYS)[number];
/** T2 window-chrome colour roles (identical key set in every theme). */
export type ChromeColorKey = (typeof CHROME_COLOR_KEYS)[number];
/** Elevation levels. */
export type ShadowKey = (typeof SHADOW_KEYS)[number];

/** Lower-case `#rrggbb`. */
export type HexColor = `#${string}`;

// ─── Primitive definitions ────────────────────────────────────────────

export interface NordColor {
  readonly hex: HexColor;
  /** Official name, e.g. "Polar Night". */
  readonly group: 'Polar Night' | 'Snow Storm' | 'Frost' | 'Aurora';
  /** Official usage guidance (nordtheme.com). */
  readonly usage: string;
}

/**
 * A derived primitive. `hex` is computed from `from` + `op` when the token source loads and
 * is published in `tokens.json`; a unit test pins a few values so maths changes are noticed.
 */
export interface DerivedColor {
  readonly hex: HexColor;
  readonly from: NordColorKey;
  readonly op:
    | { readonly kind: 'lighten' | 'darken'; readonly deltaL: number } // OKLCH ΔL (0–1)
    | { readonly kind: 'mix'; readonly with: PrimitiveColorKey; readonly weight: number }; // % of `from`
  readonly reason: string;
}

// ─── Semantic values ──────────────────────────────────────────────────

/** A theme colour: an opaque reference, a reference with alpha (0–1), or transparent. */
export type ColorValue =
  | { readonly ref: PrimitiveColorKey }
  | { readonly ref: PrimitiveColorKey; readonly alpha: number }
  | 'transparent';

export interface ShadowLayer {
  readonly x: number; // px
  readonly y: number; // px
  readonly blur: number; // px
  readonly spread: number; // px
  readonly color: ColorValue;
  readonly inset?: boolean;
}

export type TextPairKey = SemanticColorKey | ChromeColorKey;

/** A foreground/background pair that must meet a minimum WCAG contrast ratio. */
export interface ContrastRequirement {
  readonly fg: TextPairKey;
  readonly bg: TextPairKey;
  /** 4.5 = AA body text, 3 = AA large text / UI components & focus indicators. */
  readonly min: 3 | 4.5;
}

export type ThemeId = 'polar-night' | 'snow-storm';

export interface ThemeDefinition {
  readonly id: ThemeId;
  readonly name: string; // "Nord · Polar Night"
  readonly scheme: 'dark' | 'light';
  readonly color: Readonly<Record<SemanticColorKey, ColorValue>>;
  readonly component: Readonly<Record<ChromeColorKey, ColorValue>>;
  readonly shadow: Readonly<Record<ShadowKey, readonly ShadowLayer[]>>;
  /** Overrides applied under `@media (prefers-contrast: more)`. */
  readonly highContrast?: Readonly<Partial<Record<SemanticColorKey, ColorValue>>>;
  readonly contrast: readonly ContrastRequirement[];
}

// ─── Scales ───────────────────────────────────────────────────────────

export type TypeScaleKey = '2xs' | 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

export interface TypeStep {
  readonly size: number; // px
  readonly lineHeight: number; // px
  readonly tracking: number; // em
}

export interface TypographyTokens {
  readonly family: {
    readonly sans: readonly string[];
    /** Used on `[data-platform="macos"]` so SF Pro renders natively. */
    readonly sansMacos: readonly string[];
    readonly mono: readonly string[];
  };
  readonly weight: Readonly<Record<'regular' | 'medium' | 'semibold' | 'bold', number>>;
  readonly leading: Readonly<Record<'none' | 'tight' | 'snug' | 'normal' | 'relaxed', number>>;
  readonly scale: Readonly<Record<TypeScaleKey, TypeStep>>;
  readonly code: TypeStep;
  /** OpenType features for the UI font (e.g. Inter `cv11`, `ss01`). */
  readonly features: readonly string[];
}

export type SpaceKey =
  | '0'
  | '0.5'
  | '1'
  | '1.5'
  | '2'
  | '2.5'
  | '3'
  | '4'
  | '5'
  | '6'
  | '8'
  | '10'
  | '12'
  | '16';

export type RadiusScaleKey = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type RadiusAliasKey = 'control' | 'menu-item' | 'popover' | 'card' | 'dialog' | 'window';

export interface RadiusTokens {
  readonly scale: Readonly<Record<RadiusScaleKey, number>>; // px
  readonly alias: Readonly<Record<RadiusAliasKey, RadiusScaleKey>>;
}

export type DurationKey = 'instant' | 'fast' | 'base' | 'moderate' | 'slow';
export type EasingKey = 'standard' | 'enter' | 'exit' | 'spring';
export type CubicBezier = readonly [number, number, number, number];
export type Easing =
  | { readonly kind: 'cubic-bezier'; readonly points: CubicBezier }
  | { readonly kind: 'linear'; readonly stops: readonly number[]; readonly fallback: CubicBezier };

export interface MotionTokens {
  readonly duration: Readonly<Record<DurationKey, number>>; // ms
  readonly easing: Readonly<Record<EasingKey, Easing>>;
  readonly distance: number; // px an element travels on enter
  readonly scaleFrom: number; // scale an element grows from on enter
}

export type ZIndexKey =
  | 'base'
  | 'raised'
  | 'sticky'
  | 'chrome'
  | 'sash'
  | 'popover'
  | 'scrim'
  | 'dialog'
  | 'toast'
  | 'tooltip'
  | 'max';

export type LayoutSizeKey =
  | 'titlebar'
  | 'statusbar'
  | 'tabbar'
  | 'toolbar'
  | 'panel-header'
  | 'sidebar'
  | 'sidebar-min'
  | 'sidebar-max'
  | 'sidebar-rail'
  | 'control-xs'
  | 'control-sm'
  | 'control-md'
  | 'control-lg'
  | 'control-xl'
  | 'row-sm'
  | 'row-md'
  | 'menu-item'
  | 'icon-sm'
  | 'icon-md'
  | 'icon-lg'
  | 'traffic-light'
  | 'traffic-gap'
  | 'traffic-inset-x'
  | 'traffic-spacer'
  | 'command-center-max'
  | 'palette'
  | 'dialog-sm'
  | 'dialog-md'
  | 'dialog-lg'
  | 'content-max'
  | 'window-min-width'
  | 'window-min-height'
  | 'window-width'
  | 'window-height';
