/**
 * Nord · Polar Night — the dark theme.
 * Chrome (titlebar, sidebar, status bar) sits one step darker than content so it recedes,
 * Frost `nord8` is the single accent and Aurora colours only ever mean status.
 */

import type { ColorValue, PrimitiveColorKey, ShadowLayer, ThemeDefinition } from '../token.types';
import { STANDARD_CONTRAST } from './theme.contrast';

const c = (ref: PrimitiveColorKey, alpha?: number): ColorValue =>
  alpha === undefined ? { ref } : { ref, alpha };

const shadow = (
  x: number,
  y: number,
  blur: number,
  spread: number,
  color: ColorValue,
  inset?: true,
): ShadowLayer => (inset ? { x, y, blur, spread, color, inset } : { x, y, blur, spread, color });

export const polarNight: ThemeDefinition = {
  id: 'polar-night',
  name: 'Nord · Polar Night',
  scheme: 'dark',

  color: {
    // Surfaces
    canvas: c('nord-0'),
    surface: c('nord-0'),
    'surface-sidebar': c('nord-0-d03'),
    'surface-panel': c('nord-0'),
    'surface-raised': c('nord-1'),
    'surface-popover': c('nord-1'),
    'surface-dialog': c('nord-1'),
    'surface-sunken': c('nord-0-d03'),
    field: c('nord-0-d03'),
    scrim: c('black', 0.45),
    // Borders
    'border-subtle': c('nord-6', 0.07),
    border: c('nord-6', 0.12),
    'border-strong': c('nord-3-bright'),
    // Text
    'fg-strong': c('nord-6'),
    fg: c('nord-4'),
    'fg-secondary': c('nord-4-m0-85'),
    'fg-muted': c('nord-4-m0-75'),
    'fg-disabled': c('nord-4-m0-35'),
    'on-accent': c('nord-0'),
    // Accent (Frost nord8)
    accent: c('nord-8'),
    'accent-hover': c('nord-8-l03'),
    'accent-active': c('nord-8-d04'),
    'accent-fg': c('nord-8'),
    'accent-subtle': c('nord-8', 0.14),
    'accent-border': c('nord-8', 0.5),
    // Focus & selection
    focus: c('nord-8'),
    'focus-halo': c('nord-8', 0.28),
    selection: c('nord-10', 0.55),
    'selection-inactive': c('nord-3', 0.6),
    // Fills & controls
    'fill-hover': c('nord-6', 0.06),
    'fill-pressed': c('nord-6', 0.1),
    'fill-selected-inactive': c('nord-6', 0.08),
    control: c('nord-6', 0.07),
    'control-hover': c('nord-6', 0.11),
    'control-pressed': c('nord-6', 0.15),
    track: c('nord-6', 0.14),
    thumb: c('nord-6'),
    // Status
    danger: c('nord-11-d08'),
    'danger-hover': c('nord-11'),
    'on-danger': c('white'),
    'danger-fg': c('nord-11-l16'),
    'danger-subtle': c('nord-11', 0.16),
    'danger-border': c('nord-11', 0.5),
    warning: c('nord-13'),
    'warning-hover': c('nord-13-l03'),
    'on-warning': c('nord-0'),
    'warning-fg': c('nord-13'),
    'warning-subtle': c('nord-13', 0.14),
    'warning-border': c('nord-13', 0.45),
    success: c('nord-14'),
    'success-hover': c('nord-14-l03'),
    'on-success': c('nord-0'),
    'success-fg': c('nord-14'),
    'success-subtle': c('nord-14', 0.14),
    'success-border': c('nord-14', 0.45),
    info: c('nord-9'),
    'info-hover': c('nord-9-l04'),
    'on-info': c('nord-0'),
    'info-fg': c('nord-9-l08'),
    'info-subtle': c('nord-9', 0.16),
    'info-border': c('nord-9', 0.5),
  },

  component: {
    'titlebar-bg': c('nord-0-d03'),
    'titlebar-bg-inactive': c('nord-0'),
    'titlebar-fg': c('nord-4-m0-85'),
    'titlebar-fg-inactive': c('nord-4-m0-35'),
    'titlebar-border': c('black', 0.28),
    'command-center-bg': c('nord-6', 0.05),
    'command-center-bg-hover': c('nord-6', 0.09),
    'command-center-border': c('nord-6', 0.08),
    'statusbar-bg': c('nord-0-d03'),
    'statusbar-fg': c('nord-4-m0-75'),
    'statusbar-bg-hover': c('nord-6', 0.08),
    'statusbar-bg-active': c('nord-6', 0.12),
    'statusbar-accent-bg': c('nord-8'),
    'statusbar-accent-fg': c('nord-0'),
    'statusbar-accent-bg-hover': c('nord-8-l03'),
    'statusbar-border': c('black', 0.28),
    'tab-strip-bg': c('nord-0-d03'),
    'tab-active-bg': c('nord-0'),
    'tab-indicator': c('nord-8'),
    'tooltip-bg': c('nord-1'),
    'tooltip-fg': c('nord-6'),
    'tooltip-border': c('nord-6', 0.1),
    'traffic-close': c('nord-11'),
    'traffic-minimize': c('nord-13'),
    'traffic-maximize': c('nord-14'),
    'traffic-close-pressed': c('nord-11-d10'),
    'traffic-minimize-pressed': c('nord-13-d20'),
    'traffic-maximize-pressed': c('nord-14-d12'),
    'traffic-inactive': c('nord-3'),
    'traffic-rim': c('black', 0.22),
    'traffic-glyph': c('black', 0.55),
    'scrollbar-thumb': c('nord-6', 0.14),
    'scrollbar-thumb-hover': c('nord-6', 0.22),
    'scrollbar-thumb-active': c('nord-6', 0.3),
  },

  shadow: {
    control: [shadow(0, 1, 1, 0, c('black', 0.22)), shadow(0, 1, 0, 0, c('white', 0.04), true)],
    card: [shadow(0, 1, 2, 0, c('black', 0.28)), shadow(0, 4, 12, 0, c('black', 0.18))],
    popover: [
      shadow(0, 0, 0, 0.5, c('black', 0.6)),
      shadow(0, 2, 6, 0, c('black', 0.24)),
      shadow(0, 12, 32, 0, c('black', 0.36)),
      shadow(0, 1, 0, 0, c('white', 0.07), true),
    ],
    dialog: [
      shadow(0, 0, 0, 0.5, c('black', 0.65)),
      shadow(0, 4, 12, 0, c('black', 0.28)),
      shadow(0, 24, 64, 0, c('black', 0.45)),
      shadow(0, 1, 0, 0, c('white', 0.08), true),
    ],
    inset: [shadow(0, 1, 2, 0, c('black', 0.22), true)],
  },

  highContrast: {
    'border-subtle': c('nord-6', 0.2),
    border: c('nord-6', 0.32),
    'border-strong': c('nord-4'),
    'fg-secondary': c('nord-4'),
    'fg-muted': c('nord-4-m0-85'),
  },

  contrast: STANDARD_CONTRAST,
};
