/**
 * `bun run tokens [--check]` — regenerate design tokens (CSS, Tailwind theme, TS, JSON, Rust).
 */
import { defineCommand } from '../lib/args';
import { fromRoot } from '../lib/paths';
import { runOrThrow } from '../lib/run';

await defineCommand({
  name: 'tokens',
  summary:
    'Regenerate every design-token output from packages/tokens (including crates/design-tokens).',
  usage: '[--check]',
  options: {
    check: {
      type: 'boolean',
      short: 'c',
      description: 'Fail if generated files drift from the source (CI).',
    },
  },
  async run({ values }) {
    await runOrThrow(['bun', 'scripts/build-tokens.ts', ...(values.check ? ['--check'] : [])], {
      cwd: fromRoot('packages/tokens'),
    });
  },
});
