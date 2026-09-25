/**
 * CSS custom properties:
 *  - nord.primitives.css  — `--gs-nord-*` palette + derived shades
 *  - tokens.scales.css    — typography, radius, spacing, z-index, motion, layout sizes
 *  - nord.<theme>.css     — per-theme semantic + chrome roles and shadows
 *  - tokens.css           — imports all of the above
 */

import { colorToCss, shadowToCss } from '../../src/lib/theme.resolve';
import { DERIVED, NORD } from '../../src/tokens/color.tokens';
import { LAYOUT_SIZE, RADIUS, SPACE, Z_INDEX } from '../../src/tokens/layout.tokens';
import { MOTION } from '../../src/tokens/motion.tokens';
import { TYPOGRAPHY } from '../../src/tokens/typography.tokens';
import type { ThemeDefinition } from '../../src/token.types';
import { block, cssBanner, easingFallbackToCss, easingToCss, entries, px } from './emit.shared';

export function emitPrimitivesCss(): string {
  const decls: Array<[string, string]> = [
    ...entries(NORD).map(([k, v]) => [`--gs-${k}`, v.hex] as [string, string]),
    ...entries(DERIVED).map(([k, v]) => [`--gs-${k}`, v.hex] as [string, string]),
  ];
  return `${cssBanner()}\n/* Official Nord palette (nordtheme.com) + derived shades. Themes reference these. */\n${block(':root', decls)}`;
}

export function emitScalesCss(): string {
  const t = TYPOGRAPHY;
  const decls: Array<[string, string]> = [
    ['--gs-font-sans', t.family.sans.join(', ')],
    ['--gs-font-mono', t.family.mono.join(', ')],
    ['--gs-font-features', t.features.map((f) => `"${f}"`).join(', ')],
    ...entries(t.weight).map(([k, v]) => [`--gs-font-weight-${k}`, String(v)] as [string, string]),
    ...entries(t.leading).map(([k, v]) => [`--gs-leading-${k}`, String(v)] as [string, string]),
  ];
  for (const [k, s] of entries(t.scale)) {
    decls.push([`--gs-text-${k}`, px(s.size)]);
    decls.push([`--gs-text-${k}-line-height`, px(s.lineHeight)]);
    decls.push([`--gs-text-${k}-tracking`, `${s.tracking}em`]);
  }
  decls.push(['--gs-text-code', px(t.code.size)], ['--gs-text-code-line-height', px(t.code.lineHeight)]);

  for (const [k, v] of entries(RADIUS.scale)) decls.push([`--gs-radius-${k}`, px(v)]);
  for (const [k, v] of entries(RADIUS.alias)) decls.push([`--gs-radius-${k}`, `var(--gs-radius-${v})`]);
  for (const [k, v] of entries(SPACE)) decls.push([`--gs-space-${k.replace('.', '_')}`, px(v)]);
  for (const [k, v] of entries(Z_INDEX)) decls.push([`--gs-z-${k}`, String(v)]);
  for (const [k, v] of entries(MOTION.duration)) decls.push([`--gs-duration-${k}`, `${v}ms`]);
  for (const [k, v] of entries(MOTION.easing)) decls.push([`--gs-ease-${k}`, easingFallbackToCss(v)]);
  decls.push(['--gs-motion-distance', px(MOTION.distance)], ['--gs-motion-scale-from', String(MOTION.scaleFrom)]);
  for (const [k, v] of entries(LAYOUT_SIZE)) decls.push([`--gs-size-${k}`, px(v)]);

  const linearEasings = entries(MOTION.easing)
    .filter(([, v]) => v.kind === 'linear')
    .map(([k, v]) => [`--gs-ease-${k}`, easingToCss(v)] as [string, string]);

  const reduced = entries(MOTION.duration)
    .filter(([k]) => k !== 'instant')
    .map(([k]) => [`--gs-duration-${k}`, '0ms'] as [string, string]);
  reduced.push(['--gs-motion-distance', '0'], ['--gs-motion-scale-from', '1']);

  return [
    cssBanner(),
    '/* Scales: typography, radius, spacing, z-index, motion and layout sizes. */',
    block(':root', decls),
    '/* macOS renders SF Pro natively; everywhere else ships Inter. */',
    block(':root[data-platform="macos"]', [['--gs-font-sans', t.family.sansMacos.join(', ')]]),
    '/* Exact spring curve where `linear()` is supported. */',
    `@supports (transition-timing-function: linear(0, 1)) {\n${block(':root', linearEasings, '  ')}}\n`,
    `@media (prefers-reduced-motion: reduce) {\n${block(':root', reduced, '  ')}}\n`,
  ].join('\n');
}

function themeDeclarations(theme: ThemeDefinition): Array<[string, string]> {
  return [
    ['color-scheme', theme.scheme],
    ...entries(theme.color).map(([k, v]) => [`--gs-color-${k}`, colorToCss(v)] as [string, string]),
    ...entries(theme.component).map(([k, v]) => [`--gs-${k}`, colorToCss(v)] as [string, string]),
    ...entries(theme.shadow).map(([k, v]) => [`--gs-shadow-${k}`, shadowToCss(v)] as [string, string]),
  ];
}

export function emitThemeCss(theme: ThemeDefinition, isDefault: boolean): string {
  const selector = isDefault ? `:root,\n[data-theme="${theme.id}"]` : `[data-theme="${theme.id}"]`;
  const parts = [
    cssBanner(),
    `/* ${theme.name} (${theme.scheme}). Applied by [data-theme="${theme.id}"]${isDefault ? ' and by default' : ''}. */`,
    block(selector, themeDeclarations(theme)),
  ];
  if (!isDefault) {
    parts.push(
      '/* Follows the OS when no theme is chosen explicitly. */',
      `@media (prefers-color-scheme: ${theme.scheme}) {\n${block(':root:not([data-theme])', themeDeclarations(theme), '  ')}}\n`,
    );
  }
  if (theme.highContrast) {
    const hc = Object.entries(theme.highContrast).flatMap(([k, v]) =>
      v === undefined ? [] : [[`--gs-color-${k}`, colorToCss(v)] as [string, string]],
    );
    parts.push(`@media (prefers-contrast: more) {\n${block(`[data-theme="${theme.id}"]`, hc, '  ')}}\n`);
  }
  return parts.join('\n');
}

export function emitIndexCss(themeFiles: readonly string[]): string {
  const imports = ['nord.primitives.css', 'tokens.scales.css', ...themeFiles].map((f) => `@import './${f}';`);
  return `${cssBanner()}\n${imports.join('\n')}\n`;
}
