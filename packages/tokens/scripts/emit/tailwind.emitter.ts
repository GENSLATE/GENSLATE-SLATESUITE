/**
 * Tailwind CSS v4 theme (`@theme inline`) mapping tokens onto utilities, plus the matching
 * tailwind-merge configuration so `cn()` resolves conflicts between custom utilities.
 *
 * Tailwind's default palette, type scale, radii and shadows are reset (`--x-*: initial`) so only
 * token-backed utilities exist — `bg-gray-800` simply does not compile.
 */

import { CHROME_COLOR_KEYS, SEMANTIC_COLOR_KEYS, SHADOW_KEYS } from '../../src/token.keys';
import { LAYOUT_SIZE, RADIUS, Z_INDEX } from '../../src/tokens/layout.tokens';
import { MOTION } from '../../src/tokens/motion.tokens';
import { TYPOGRAPHY } from '../../src/tokens/typography.tokens';
import { cssBanner, tsBanner } from './emit.shared';

/** Layout sizes that are also exposed as `max-w-*` / `w-*` container widths. */
const CONTAINER_SIZES = ['command-center-max', 'palette', 'dialog-sm', 'dialog-md', 'dialog-lg', 'content-max'] as const;

export function emitTailwindThemeCss(): string {
  const lines: string[] = [];
  const add = (k: string, v: string) => lines.push(`  ${k}: ${v};`);
  const section = (title: string) => lines.push('', `  /* ${title} */`);

  section('Colours — Tailwind palette removed; only semantic + chrome roles exist.');
  add('--color-*', 'initial');
  add('--color-transparent', 'transparent');
  add('--color-current', 'currentColor');
  for (const k of SEMANTIC_COLOR_KEYS) add(`--color-${k}`, `var(--gs-color-${k})`);
  for (const k of CHROME_COLOR_KEYS) add(`--color-${k}`, `var(--gs-${k})`);

  section('Typography');
  add('--font-*', 'initial');
  add('--font-sans', 'var(--gs-font-sans)');
  add('--font-mono', 'var(--gs-font-mono)');
  add('--default-font-family', 'var(--gs-font-sans)');
  add('--default-font-feature-settings', 'var(--gs-font-features)');
  add('--default-mono-font-family', 'var(--gs-font-mono)');
  add('--text-*', 'initial');
  for (const k of Object.keys(TYPOGRAPHY.scale)) {
    add(`--text-${k}`, `var(--gs-text-${k})`);
    add(`--text-${k}--line-height`, `var(--gs-text-${k}-line-height)`);
    add(`--text-${k}--letter-spacing`, `var(--gs-text-${k}-tracking)`);
  }
  add('--text-code', 'var(--gs-text-code)');
  add('--text-code--line-height', 'var(--gs-text-code-line-height)');
  add('--font-weight-*', 'initial');
  add('--font-weight-normal', 'var(--gs-font-weight-regular)');
  for (const k of ['medium', 'semibold', 'bold'] as const) add(`--font-weight-${k}`, `var(--gs-font-weight-${k})`);
  add('--leading-*', 'initial');
  for (const k of Object.keys(TYPOGRAPHY.leading)) add(`--leading-${k}`, `var(--gs-leading-${k})`);

  section('Radius');
  add('--radius-*', 'initial');
  for (const k of [...Object.keys(RADIUS.scale), ...Object.keys(RADIUS.alias)]) add(`--radius-${k}`, `var(--gs-radius-${k})`);

  section('Elevation');
  add('--shadow-*', 'initial');
  add('--inset-shadow-*', 'initial');
  for (const k of SHADOW_KEYS) add(`--shadow-${k}`, `var(--gs-shadow-${k})`);

  section('Motion');
  add('--ease-*', 'initial');
  for (const k of Object.keys(MOTION.easing)) add(`--ease-${k}`, `var(--gs-ease-${k})`);
  for (const k of Object.keys(MOTION.duration)) add(`--transition-duration-${k}`, `var(--gs-duration-${k})`);
  add('--default-transition-duration', 'var(--gs-duration-fast)');
  add('--default-transition-timing-function', 'var(--gs-ease-standard)');

  section('Z-index');
  for (const k of Object.keys(Z_INDEX)) add(`--z-index-${k}`, `var(--gs-z-${k})`);

  section('Layout sizes (h-titlebar, size-control-md, w-sidebar, …)');
  for (const k of Object.keys(LAYOUT_SIZE)) add(`--spacing-${k}`, `var(--gs-size-${k})`);
  for (const k of CONTAINER_SIZES) add(`--container-${k}`, `var(--gs-size-${k})`);

  return `${cssBanner()}\n/* Tailwind CSS v4 theme for GENSLATE. Import after \`@import "tailwindcss"\`. */\n@theme inline {${lines.join('\n')}\n}\n`;
}

export function emitTwMergeConfig(): string {
  const config = {
    extend: {
      theme: {
        color: [...SEMANTIC_COLOR_KEYS, ...CHROME_COLOR_KEYS],
        text: [...Object.keys(TYPOGRAPHY.scale), 'code'],
        'font-weight': ['normal', 'medium', 'semibold', 'bold'],
        leading: Object.keys(TYPOGRAPHY.leading),
        radius: [...Object.keys(RADIUS.scale), ...Object.keys(RADIUS.alias)],
        shadow: [...SHADOW_KEYS],
        ease: Object.keys(MOTION.easing),
        spacing: Object.keys(LAYOUT_SIZE),
        container: [...CONTAINER_SIZES],
      },
      classGroups: {
        z: [{ z: Object.keys(Z_INDEX) }],
        duration: [{ duration: Object.keys(MOTION.duration) }],
      },
    },
  };
  return `${tsBanner()}
/**
 * tailwind-merge extension matching the generated \`@theme\`. Pass it to
 * \`extendTailwindMerge()\` / tailwind-variants \`createTV({ twMergeConfig })\`.
 */
export const twMergeConfig = ${JSON.stringify(config, null, 2)} as const;
`;
}
