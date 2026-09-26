#!/usr/bin/env bun
/**
 * PostToolUse (Edit | Write | MultiEdit): formats the file Claude just changed.
 *
 * - TS / JS / JSON / CSS → Biome (`check --write`: format + safe fixes + import sorting)
 * - Rust                 → rustfmt (reads /rustfmt.toml)
 *
 * Fail-open: a missing tool, a timeout or a formatter error never blocks Claude. Remaining lint
 * problems are reported back as context so Claude can fix them in its next edit.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { editedFile, projectDir, readHookInput, run, type ToolHookInput } from './hook.shared';

const BIOME_EXTENSIONS = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|json|jsonc|css)$/;
const GENERATED = /(?:^|\/)(?:generated|gen|node_modules|target|dist)\//;

const input = await readHookInput<ToolHookInput>();
const path = editedFile(input);

if (path === undefined || GENERATED.test(path) || !existsSync(join(projectDir, path))) {
  process.exit(0);
}

if (BIOME_EXTENSIONS.test(path)) {
  const result = await run([
    'bun',
    'x',
    'biome',
    'check',
    '--config-path=.config/biome.json',
    '--write',
    '--no-errors-on-unmatched',
    '--files-ignore-unknown=true',
    '--max-diagnostics=10',
    path,
  ]);
  if (result.code !== undefined && result.code !== 0 && result.output !== '') {
    // Non-blocking feedback: surfaced to Claude as additional context.
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `Biome reported problems in ${path} after formatting:\n${result.output.slice(0, 4000)}`,
        },
      }),
    );
  }
} else if (path.endsWith('.rs')) {
  await run(['rustfmt', '--edition', '2024', path]);
}

process.exit(0);
