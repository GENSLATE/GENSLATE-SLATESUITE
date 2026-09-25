/**
 * `bun run check` — every gate CI runs: types, lint, spelling, dead code, token drift, Rust.
 */
import { relative } from 'node:path';

import { defineCommand } from '../lib/args';
import { log } from '../lib/log';
import { moonAvailable, moonRun } from '../lib/moon';
import { fromRoot, ROOT } from '../lib/paths';
import { discoverProjects } from '../lib/projects';
import { run } from '../lib/run';

interface Gate {
  readonly name: string;
  readonly argv: readonly string[];
  readonly cwd?: string;
}

await defineCommand({
  name: 'check',
  summary:
    'Run every quality gate CI runs (typecheck, biome, cspell, knip, tokens drift, rustfmt, clippy).',
  usage: '[--ts] [--rust] [--direct]',
  options: {
    ts: { type: 'boolean', description: 'Only the TypeScript / repo-wide gates.' },
    rust: { type: 'boolean', description: 'Only rustfmt + clippy.' },
    direct: {
      type: 'boolean',
      description: 'Skip moon; run each tool directly (continues past failures).',
    },
  },
  async run({ values }) {
    const both = values.ts === values.rust;
    const ts = both || values.ts;
    const rust = both || values.rust;

    if (!values.direct && (await moonAvailable())) {
      const targets = [
        ...(ts ? [':typecheck', 'tokens:check', 'root:lint', 'root:spell', 'root:knip'] : []),
        ...(rust ? ['root:rust-fmt', 'root:rust-lint'] : []),
      ];
      process.exitCode = await moonRun(targets);
      return;
    }

    const gates: Gate[] = [];
    if (ts) {
      for (const project of await discoverProjects()) {
        if (project.hasTsconfig) {
          gates.push({
            name: `typecheck ${relative(ROOT, project.dir)}`,
            argv: [fromRoot('node_modules/.bin/tsc'), '--noEmit', '-p', 'tsconfig.json'],
            cwd: project.dir,
          });
        }
      }
      gates.push(
        {
          name: 'typecheck scripts',
          argv: [fromRoot('node_modules/.bin/tsc'), '--noEmit', '-p', 'tsconfig.json'],
        },
        {
          name: 'tokens drift',
          argv: ['bun', 'scripts/build-tokens.ts', '--check'],
          cwd: fromRoot('packages/tokens'),
        },
        {
          name: 'biome',
          argv: ['bunx', 'biome', 'check', '--config-path', '.config/biome.json', '.'],
        },
        {
          name: 'cspell',
          argv: [
            'bunx',
            'cspell',
            '--config',
            '.config/cspell.json',
            '--no-progress',
            '--gitignore',
            '.',
          ],
        },
        { name: 'knip', argv: ['bunx', 'knip', '--config', '.config/knip.json'] },
      );
    }
    if (rust) {
      gates.push(
        { name: 'rustfmt', argv: ['cargo', 'fmt', '--all', '--check'] },
        {
          name: 'clippy',
          argv: ['cargo', 'clippy', '--workspace', '--all-targets', '--', '-D', 'warnings'],
        },
      );
    }

    const failed: string[] = [];
    for (const gate of gates) {
      log.title(gate.name);
      const code = await run(gate.argv, gate.cwd === undefined ? {} : { cwd: gate.cwd });
      if (code !== 0) failed.push(gate.name);
    }
    log.title('Summary');
    for (const gate of gates) (failed.includes(gate.name) ? log.error : log.success)(gate.name);
    if (failed.length > 0) process.exitCode = 1;
  },
});
