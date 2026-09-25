#!/usr/bin/env bun
/**
 * Generates every token output from the typed source in `src/`.
 *
 *   bun scripts/build-tokens.ts           write outputs
 *   bun scripts/build-tokens.ts --check   fail if committed outputs are stale or contrast fails
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { DEFAULT_THEME, THEMES } from '../src/index';
import {
  emitIndexCss,
  emitPrimitivesCss,
  emitScalesCss,
  emitThemeCss,
} from './emit/css.emitter';
import {
  checkContrast,
  emitContrastReport,
  emitTokensJson,
  emitTokensTs,
} from './emit/data.emitter';
import { emitRustColorsStruct, emitRustTokens } from './emit/rust.emitter';
import { emitTailwindThemeCss, emitTwMergeConfig } from './emit/tailwind.emitter';

const PACKAGE_DIR = resolve(import.meta.dir, '..');
const REPO_DIR = resolve(PACKAGE_DIR, '../..');
const OUT = join(PACKAGE_DIR, 'src/generated');
const RUST_OUT = join(REPO_DIR, 'crates/design-tokens/src/generated');

const checkOnly = process.argv.includes('--check');

/** Formats Rust through rustfmt (stdin → stdout) so the committed file passes `cargo fmt --check`. */
async function rustfmt(source: string): Promise<string> {
  try {
    const proc = Bun.spawn(['rustfmt', '--edition', '2024', '--config-path', join(REPO_DIR, 'rustfmt.toml')], {
      stdin: new TextEncoder().encode(source),
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    return code === 0 ? out : source;
  } catch {
    return source;
  }
}

async function main(): Promise<void> {
  const themes = [THEMES[DEFAULT_THEME], ...Object.values(THEMES).filter((t) => t.id !== DEFAULT_THEME)];
  const themeFiles = themes.map((t) => `nord.${t.id}.css`);
  const contrast = checkContrast(themes);

  const files: Record<string, string> = {
    [join(OUT, 'css/nord.primitives.css')]: emitPrimitivesCss(),
    [join(OUT, 'css/tokens.scales.css')]: emitScalesCss(),
    ...Object.fromEntries(themes.map((t, i) => [join(OUT, `css/${themeFiles[i]}`), emitThemeCss(t, t.id === DEFAULT_THEME)])),
    [join(OUT, 'css/tokens.css')]: emitIndexCss(themeFiles),
    [join(OUT, 'css/tailwind.theme.css')]: emitTailwindThemeCss(),
    [join(OUT, 'ts/tokens.generated.ts')]: emitTokensTs(themes),
    [join(OUT, 'ts/tw-merge.config.ts')]: emitTwMergeConfig(),
    [join(OUT, 'json/tokens.json')]: emitTokensJson(themes),
    [join(OUT, 'json/contrast-report.json')]: emitContrastReport(contrast),
    [join(RUST_OUT, 'tokens.rs')]: await rustfmt(emitRustTokens(themes)),
    [join(RUST_OUT, 'theme_colors.rs')]: await rustfmt(emitRustColorsStruct()),
  };

  const stale: string[] = [];
  for (const [path, content] of Object.entries(files)) {
    const current = await readFile(path, 'utf8').catch(() => null);
    if (current === content) continue;
    if (checkOnly) {
      stale.push(relative(REPO_DIR, path));
    } else {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
      console.log(`  wrote ${relative(REPO_DIR, path)}`);
    }
  }

  const failures = contrast.filter((r) => !r.pass);
  for (const f of failures) {
    console.error(`  ✗ contrast ${f.theme}: ${f.fg} on ${f.bg} = ${f.ratio}:1 (needs ${f.min}:1) ${f.fgHex}/${f.bgHex}`);
  }
  if (stale.length > 0) {
    console.error(`  ✗ generated token files are stale — run \`bun run tokens\`:\n    ${stale.join('\n    ')}`);
  }
  if (failures.length > 0 || stale.length > 0) process.exit(1);
  console.log(`  ✓ tokens ${checkOnly ? 'up to date' : 'generated'} · ${contrast.length} contrast pairs pass`);
}

await main();
