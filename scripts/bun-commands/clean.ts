/**
 * `bun run clean [--all]` — remove build output and caches.
 */
import { rm } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { defineCommand } from '../lib/args';
import { log } from '../lib/log';
import { fromRoot, ROOT } from '../lib/paths';
import { run } from '../lib/run';

await defineCommand({
  name: 'clean',
  summary:
    'Remove build output (dist, coverage, *.tsbuildinfo, moon cache); --all also cargo target/ and node_modules.',
  usage: '[--all] [--dry-run]',
  options: {
    all: {
      type: 'boolean',
      short: 'a',
      description: 'Also `cargo clean` and delete every node_modules.',
    },
    'dry-run': { type: 'boolean', short: 'n', description: 'List what would be removed.' },
  },
  async run({ values }) {
    const patterns = [
      '{desktop,packages,webapp}/*/dist',
      '{desktop,packages,webapp}/*/coverage',
      'coverage',
      '**/*.tsbuildinfo',
      'desktop/*/src-tauri/gen/schemas',
      '.config/moon/cache',
      ...(values.all ? ['node_modules', '{desktop,packages,webapp}/*/node_modules'] : []),
    ];
    const targets = new Set<string>();
    for (const pattern of patterns) {
      for await (const match of new Bun.Glob(pattern).scan({
        cwd: ROOT,
        onlyFiles: false,
        dot: true,
      })) {
        if (!match.includes('node_modules/') || pattern.includes('node_modules'))
          targets.add(join(ROOT, match));
      }
    }
    for (const target of [...targets].sort()) {
      log.info(relative(ROOT, target));
      if (!values['dry-run']) await rm(target, { recursive: true, force: true });
    }
    if (values.all && !values['dry-run']) await run(['cargo', 'clean'], { cwd: fromRoot() });
    log.success(
      values['dry-run']
        ? `${targets.size} paths would be removed`
        : `removed ${targets.size} paths`,
    );
  },
});
