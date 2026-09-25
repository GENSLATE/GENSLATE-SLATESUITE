/**
 * Nord · Snow Storm — the light theme.
 * Content sits on a bright snow surface, chrome on `nord6`, and the accent is a deepened
 * Frost `nord10` so white text on it stays ≥ 4.5:1.
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

export const snowStorm: ThemeDefinition = {
  id: 'snow-storm',
  name: 'Nord · Snow Storm',
  scheme: 'light',

  color: {
    // Surfaces
    canvas: c('snow-bright'),
    surface: c('snow-bright'),
    'surface-sidebar': c('nord-6'),
    'surface-panel': c('snow-bright'),
    'surface-raised': c('white'),
    'surface-popover': c('snow-bright'),
    'surface-dialog': c('snow-bright'),
    'surface-sunken': c('nord-5'),
    field: c('white'),
    scrim: c('nord-0', 0.32),
    // Borders
    'border-subtle': c('nord-0', 0.08),
    border: c('nord-0', 0.14),
    'border-strong': c('nord-0', 0.3),
    // Text
    'fg-strong': c('nord-0'),
    fg: c('nord-1'),
    'fg-secondary': c('nord-2'),
    'fg-muted': c('nord-3'),
    'fg-disabled': c('nord-3-m6-45'),
    'on-accent': c('white'),
    // Accent (deepened Frost nord10)
    accent: c('nord-10-d08'),
    'accent-hover': c('nord-10-d10'),
    'accent-active': c('nord-10-d12'),
    'accent-fg': c('nord-10-d08'),
    'accent-subtle': c('nord-10', 0.12),
    'accent-border': c('nord-10', 0.45),
    // Focus & selection
    focus: c('nord-10'),
    'focus-halo': c('nord-10', 0.25),
    selection: c('nord-10', 0.2),
    'selection-inactive': c('nord-0', 0.08),
    // Fills & controls
    'fill-hover': c('nord-0', 0.05),
    'fill-pressed': c('nord-0', 0.09),
    'fill-selected-inactive': c('nord-0', 0.07),
    control: c('white'),
    'control-hover': c('snow-bright'),
    'control-pressed': c('nord-5'),
    track: c('nord-0', 0.12),
    thumb: c('white'),
    // Status
    danger: c('nord-11-d08'),
    'danger-hover': c('nord-11-d10'),
    'on-danger': c('white'),
    'danger-fg': c('nord-11-d10'),
    'danger-subtle': c('nord-11', 0.12),
    'danger-border': c('nord-11', 0.45),
    warning: c('nord-13'),
    'warning-hover': c('nord-13-d08'),
    'on-warning': c('nord-0'),
    'warning-fg': c('nord-13-d36'),
    'warning-subtle': c('nord-13', 0.2),
    'warning-border': c('nord-13-d20'),
    success: c('nord-14-d08'),
    'success-hover': c('nord-14-d12'),
    'on-success': c('nord-0'),
    'success-fg': c('nord-14-d28'),
    'success-subtle': c('nord-14', 0.18),
    'success-border': c('nord-14-d12'),
    info: c('nord-9-d14'),
    'info-hover': c('nord-9-d20'),
    'on-info': c('white'),
    'info-fg': c('nord-9-d20'),
    'info-subtle': c('nord-9', 0.16),
    'info-border': c('nord-9', 0.5),
  },

  component: {
    'titlebar-bg': c('nord-6'),
    'titlebar-bg-inactive': c('snow-bright'),
    'titlebar-fg': c('nord-2'),
    'titlebar-fg-inactive': c('nord-3-m6-45'),
    'titlebar-border': c('nord-0', 0.1),
    'command-center-bg': c('white', 0.6),
    'command-center-bg-hover': c('white'),
    'command-center-border': c('nord-0', 0.1),
    'statusbar-bg': c('nord-6'),
    'statusbar-fg': c('nord-3'),
    'statusbar-bg-hover': c('nord-0', 0.06),
    'statusbar-bg-active': c('nord-0', 0.1),
    'statusbar-accent-bg': c('nord-10-d08'),
    'statusbar-accent-fg': c('white'),
    'statusbar-accent-bg-hover': c('nord-10-d10'),
    'statusbar-border': c('nord-0', 0.1),
    'tab-strip-bg': c('nord-6'),
    'tab-active-bg': c('snow-bright'),
    'tab-indicator': c('nord-10'),
    'tooltip-bg': c('nord-1'),
    'tooltip-fg': c('nord-6'),
    'tooltip-border': c('nord-0', 0.2),
    'traffic-close': c('nord-11'),
    'traffic-minimize': c('nord-13'),
    'traffic-maximize': c('nord-14'),
    'traffic-close-pressed': c('nord-11-d10'),
    'traffic-minimize-pressed': c('nord-13-d20'),
    'traffic-maximize-pressed': c('nord-14-d12'),
    'traffic-inactive': c('nord-4'),
    'traffic-rim': c('nord-0', 0.14),
    'traffic-glyph': c('nord-0', 0.6),
    'scrollbar-thumb': c('nord-0', 0.16),
    'scrollbar-thumb-hover': c('nord-0', 0.26),
    'scrollbar-thumb-active': c('nord-0', 0.34),
  },

  shadow: {
    control: [shadow(0, 0, 0, 0.5, c('nord-0', 0.14)), shadow(0, 1, 1.5, 0, c('nord-0', 0.08))],
    card: [shadow(0, 0, 0, 0.5, c('nord-0', 0.08)), shadow(0, 2, 8, 0, c('nord-0', 0.06))],
    popover: [
      shadow(0, 0, 0, 0.5, c('nord-0', 0.14)),
      shadow(0, 2, 6, 0, c('nord-0', 0.08)),
      shadow(0, 12, 32, 0, c('nord-0', 0.16)),
    ],
    dialog: [
      shadow(0, 0, 0, 0.5, c('nord-0', 0.16)),
      shadow(0, 4, 12, 0, c('nord-0', 0.1)),
      shadow(0, 24, 64, 0, c('nord-0', 0.22)),
    ],
    inset: [shadow(0, 1, 2, 0, c('nord-0', 0.06), true)],
  },

  highContrast: {
    'border-subtle': c('nord-0', 0.24),
    border: c('nord-0', 0.4),
    'border-strong': c('nord-0', 0.7),
    'fg-secondary': c('nord-1'),
    'fg-muted': c('nord-2'),
  },

  contrast: STANDARD_CONTRAST,
};
