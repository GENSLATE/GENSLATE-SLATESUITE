import type { ThemeId } from '@genslate/tokens';
import { TYPOGRAPHY } from '@genslate/tokens';
import { THEME_COLORS } from '@genslate/tokens/generated';
import type { ITheme } from '@xterm/xterm';

/** The design system's monospace stack (JetBrains Mono first), as a CSS font-family. */
export const MONO_FONT_STACK = TYPOGRAPHY.family.mono.join(', ');

/** An xterm.js theme from the Nord terminal tokens (`terminal-*`) of a GENSLATE theme. */
export function xtermTheme(theme: ThemeId): ITheme {
  const c = THEME_COLORS[theme];
  return {
    background: c['terminal-bg'],
    foreground: c['terminal-fg'],
    cursor: c['terminal-cursor'],
    cursorAccent: c['terminal-cursor-text'],
    selectionBackground: c['terminal-selection'],
    selectionInactiveBackground: c['selection-inactive'],
    black: c['terminal-black'],
    red: c['terminal-red'],
    green: c['terminal-green'],
    yellow: c['terminal-yellow'],
    blue: c['terminal-blue'],
    magenta: c['terminal-magenta'],
    cyan: c['terminal-cyan'],
    white: c['terminal-white'],
    brightBlack: c['terminal-bright-black'],
    brightRed: c['terminal-bright-red'],
    brightGreen: c['terminal-bright-green'],
    brightYellow: c['terminal-bright-yellow'],
    brightBlue: c['terminal-bright-blue'],
    brightMagenta: c['terminal-bright-magenta'],
    brightCyan: c['terminal-bright-cyan'],
    brightWhite: c['terminal-bright-white'],
    scrollbarSliderBackground: c['scrollbar-thumb'],
    scrollbarSliderHoverBackground: c['scrollbar-thumb-hover'],
    scrollbarSliderActiveBackground: c['scrollbar-thumb-active'],
    overviewRulerBorder: c['border-subtle'],
  };
}

/** Colours for find-in-terminal matches and command marks in the overview ruler. */
export function markColors(theme: ThemeId) {
  const c = THEME_COLORS[theme];
  return {
    success: c['success'],
    failure: c['danger'],
    running: c['accent'],
    match: c['warning-subtle'],
    matchBorder: c['warning'],
    activeMatch: c['accent-subtle'],
    activeMatchBorder: c['accent'],
  };
}
