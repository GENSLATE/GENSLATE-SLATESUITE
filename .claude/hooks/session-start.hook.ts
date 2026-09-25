#!/usr/bin/env bun
/**
 * SessionStart: gives Claude a compact snapshot of the repo (branch, dirty files, tool versions,
 * the commands that matter). Everything here is best-effort — any failure just shortens the text.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { projectDir, readHookInput, run, type SessionStartInput } from './hook.shared';

function prototoolsVersions(): string {
  try {
    const text = readFileSync(join(projectDir, '.prototools'), 'utf8');
    const pins = [...text.matchAll(/^(\w+)\s*=\s*"([^"]+)"/gm)].map(
      ([, tool, version]) => `${tool} ${version}`,
    );
    return pins.join(' · ');
  } catch {
    return 'see .prototools';
  }
}

const input = await readHookInput<SessionStartInput>();

const [branch, status] = await Promise.all([
  run(['git', 'branch', '--show-current'], 5_000),
  run(['git', 'status', '--porcelain'], 5_000),
]);

const dirty =
  status.code === 0 ? status.output.split('\n').filter((line) => line !== '').length : undefined;

const lines = [
  `GENSLATE session (${input?.source ?? 'startup'}) — branch \`${branch.output || 'unknown'}\`${
    dirty === undefined ? '' : `, ${dirty} changed file(s)`
  }.`,
  `Toolchain (pinned in .prototools): ${prototoolsVersions()}. Use bun for everything — never npm/npx/node/pnpm.`,
  'Commands: `bun run setup | dev | check | test | format | tokens | build | package | new-app <name> | clean`.',
  'Targeted: `bun x moon run <project>:<task>` (e.g. `design-system:test`, `tokens:check`, `root:rust-lint`).',
  'Generated (never edit): packages/tokens/src/generated/**, crates/design-tokens/src/generated/** → edit packages/tokens/src then `bun run tokens`.',
  'Design contract: .claude/rules/design-system.md. Memory: .claude/memory/{active-context,decisions,lessons-learned}.md.',
];

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: lines.join('\n'),
    },
  }),
);
process.exit(0);
