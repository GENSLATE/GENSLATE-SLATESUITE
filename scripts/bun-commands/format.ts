/**
 * `bun run format [--check]` — biome (TS/JSON/CSS) + rustfmt.
 */
import { defineCommand } from '../lib/args';
import { log } from '../lib/log';
import { run } from '../lib/run';

await defineCommand({
  name: 'format',
  summary: 'Format and auto-fix TypeScript/JSON/CSS (biome) and Rust (rustfmt).',
  usage: '[--check]',
  options: {
    check: {
      type: 'boolean',
      short: 'c',
      description: 'Report unformatted files without writing.',
    },
  },
  async run({ values }) {
    log.title(values.check ? 'Checking formatting' : 'Formatting');
    const biome = await run([
      'bunx',
      'biome',
      'check',
      '--config-path',
      '.config/biome.json',
      ...(values.check ? [] : ['--write']),
      '.',
    ]);
    const rust = await run(['cargo', 'fmt', '--all', ...(values.check ? ['--check'] : [])]);
    if (biome !== 0 || rust !== 0) {
      process.exitCode = 1;
      return;
    }
    log.success(values.check ? 'everything is formatted' : 'formatted');
  },
});
