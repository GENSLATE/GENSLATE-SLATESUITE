import type { ContrastRequirement } from '../token.types';

/**
 * Pairs every theme must pass (WCAG 2.2 AA). Translucent colours are composited over their
 * background — and translucent backgrounds over `canvas` — before measuring.
 */
export const STANDARD_CONTRAST: readonly ContrastRequirement[] = [
  // Body text on every surface
  { fg: 'fg', bg: 'canvas', min: 4.5 },
  { fg: 'fg', bg: 'surface-sidebar', min: 4.5 },
  { fg: 'fg', bg: 'surface-raised', min: 4.5 },
  { fg: 'fg', bg: 'surface-popover', min: 4.5 },
  { fg: 'fg', bg: 'field', min: 4.5 },
  { fg: 'fg-strong', bg: 'selection', min: 4.5 },
  { fg: 'fg-secondary', bg: 'canvas', min: 4.5 },
  { fg: 'fg-secondary', bg: 'surface-sidebar', min: 4.5 },
  { fg: 'fg-muted', bg: 'canvas', min: 4.5 },
  { fg: 'fg-muted', bg: 'surface-sidebar', min: 4.5 },
  { fg: 'fg-muted', bg: 'surface-popover', min: 4.5 },
  // Accent
  { fg: 'on-accent', bg: 'accent', min: 4.5 },
  { fg: 'on-accent', bg: 'accent-hover', min: 4.5 },
  { fg: 'accent-fg', bg: 'canvas', min: 4.5 },
  { fg: 'focus', bg: 'canvas', min: 3 },
  { fg: 'focus', bg: 'surface-sidebar', min: 3 },
  // Status
  { fg: 'on-danger', bg: 'danger', min: 4.5 },
  { fg: 'danger-fg', bg: 'canvas', min: 4.5 },
  { fg: 'on-warning', bg: 'warning', min: 4.5 },
  { fg: 'warning-fg', bg: 'canvas', min: 4.5 },
  { fg: 'on-success', bg: 'success', min: 4.5 },
  { fg: 'success-fg', bg: 'canvas', min: 4.5 },
  { fg: 'on-info', bg: 'info', min: 4.5 },
  { fg: 'info-fg', bg: 'canvas', min: 4.5 },
  // Chrome
  { fg: 'titlebar-fg', bg: 'titlebar-bg', min: 4.5 },
  { fg: 'statusbar-fg', bg: 'statusbar-bg', min: 4.5 },
  { fg: 'statusbar-accent-fg', bg: 'statusbar-accent-bg', min: 4.5 },
  { fg: 'tooltip-fg', bg: 'tooltip-bg', min: 4.5 },
];
