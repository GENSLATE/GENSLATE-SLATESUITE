/**
 * Spacing, radius, z-index and layout sizes. Densities follow VS Code (rows 22, controls 28,
 * status bar 24) and proportions follow macOS (titlebar 38, radii 6/8/12).
 */

import type { LayoutSizeKey, RadiusTokens, SpaceKey, ZIndexKey } from '../token.types';

/** Tailwind's 4px grid, exposed as `--gs-space-*` for non-Tailwind consumers. */
export const SPACE: Readonly<Record<SpaceKey, number>> = {
  '0': 0,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
};

export const RADIUS: RadiusTokens = {
  scale: { none: 0, xs: 3, sm: 4, md: 6, lg: 8, xl: 10, '2xl': 12, full: 9999 },
  alias: {
    control: 'md',
    'menu-item': 'sm',
    popover: 'lg',
    card: 'lg',
    dialog: '2xl',
    window: 'xl',
  },
};

export const Z_INDEX: Readonly<Record<ZIndexKey, number>> = {
  base: 0,
  raised: 10,
  sticky: 20,
  chrome: 30,
  sash: 40,
  popover: 50,
  scrim: 60,
  dialog: 70,
  toast: 80,
  tooltip: 90,
  max: 2_147_483_647,
};

/** Fixed component and window sizes in px. */
export const LAYOUT_SIZE: Readonly<Record<LayoutSizeKey, number>> = {
  titlebar: 38,
  statusbar: 24,
  tabbar: 36,
  toolbar: 36,
  'panel-header': 30,
  sidebar: 248,
  'sidebar-min': 180,
  'sidebar-max': 420,
  'sidebar-rail': 48,
  'control-xs': 20,
  'control-sm': 24,
  'control-md': 28,
  'control-lg': 32,
  'control-xl': 36,
  'row-sm': 22,
  'row-md': 28,
  'menu-item': 24,
  'icon-sm': 14,
  'icon-md': 16,
  'icon-lg': 20,
  'traffic-light': 12,
  'traffic-gap': 8,
  'traffic-inset-x': 14,
  'traffic-spacer': 78,
  'command-center-max': 480,
  palette: 560,
  'dialog-sm': 400,
  'dialog-md': 520,
  'dialog-lg': 720,
  'content-max': 1080,
  'window-min-width': 800,
  'window-min-height': 520,
  'window-width': 1280,
  'window-height': 800,
};
