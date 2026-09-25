/**
 * Rust constants for `crates/design-tokens` (window background colours, native sizes).
 */

import { parseHex } from '../../src/lib/color.math';
import { resolveHex } from '../../src/lib/theme.resolve';
import { CHROME_COLOR_KEYS, SEMANTIC_COLOR_KEYS } from '../../src/token.keys';
import { NORD } from '../../src/tokens/color.tokens';
import { LAYOUT_SIZE } from '../../src/tokens/layout.tokens';
import type { ThemeDefinition } from '../../src/token.types';
import { entries, rustBanner, screamingSnake, snake } from './emit.shared';

const rgb = (hex: string) => {
  const { r, g, b } = parseHex(hex);
  return `Rgb::new(${r}, ${g}, ${b})`;
};

const COLOR_KEYS = [...SEMANTIC_COLOR_KEYS, ...CHROME_COLOR_KEYS];

export function emitRustTokens(themes: readonly ThemeDefinition[]): string {
  const out: string[] = [rustBanner(), '//! Resolved GENSLATE design tokens.', '', 'use crate::{Rgb, Scheme, Theme, ThemeColors};', ''];

  out.push('/// Official Nord palette.', 'pub mod nord {', '    use crate::Rgb;', '');
  for (const [k, v] of entries(NORD)) {
    out.push(`    /// ${v.group}: ${v.usage}`, `    pub const ${screamingSnake(k)}: Rgb = ${rgb(v.hex)};`);
  }
  out.push('}', '');

  out.push('/// Fixed component and window sizes in logical pixels.', 'pub mod size {');
  for (const [k, v] of entries(LAYOUT_SIZE)) out.push(`    pub const ${screamingSnake(k)}: f64 = ${v.toFixed(1)};`);
  out.push('}', '');

  for (const theme of themes) {
    out.push(`/// ${theme.name}.`, `pub const ${screamingSnake(theme.id)}: Theme = Theme {`);
    out.push(`    id: "${theme.id}",`, `    name: "${theme.name}",`);
    out.push(`    scheme: Scheme::${theme.scheme === 'dark' ? 'Dark' : 'Light'},`);
    out.push('    colors: ThemeColors {');
    for (const k of COLOR_KEYS) out.push(`        ${snake(k)}: ${rgb(resolveHex(theme, k))},`);
    out.push('    },', '};', '');
  }

  out.push('/// Every theme, default first.');
  out.push(`pub const THEMES: [Theme; ${themes.length}] = [${themes.map((t) => screamingSnake(t.id)).join(', ')}];`, '');
  return out.join('\n');
}

export function emitRustColorsStruct(): string {
  const out: string[] = [
    rustBanner(),
    '//! Field list of [`ThemeColors`] (one per semantic and chrome colour role).',
    '',
    'use crate::Rgb;',
    '',
    '/// Opaque colours for every semantic and chrome role of a theme.',
    '#[derive(Debug, Clone, Copy, PartialEq, Eq)]',
    'pub struct ThemeColors {',
  ];
  for (const k of COLOR_KEYS) out.push(`    pub ${snake(k)}: Rgb,`);
  out.push('}', '');
  return out.join('\n');
}
