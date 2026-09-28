#!/usr/bin/env bun
/**
 * SessionStart: gives Claude a compact snapshot of the repo (branch, dirty files, tool versions,
 * the commands that matter) and makes sure commits are authored by the team, not the agent.
 * Everything here is best-effort — any failure just shortens the text.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { checkIdentity, parseIdent } from '../../scripts/lib/attribution';
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

const isAgent = (name: string, email: string): boolean =>
  checkIdentity('', 'author', name, email).length > 0;

/**
 * Cloud containers commit as the agent by default. When git would, switch this clone to the
 * most recent human author of a non-merge commit (no identity is hard-coded in the repo).
 * Returns a line for the session context, or `undefined` when nothing changed.
 */
async function ensureTeamIdentity(): Promise<string | undefined> {
  const current = await run(['git', 'var', 'GIT_AUTHOR_IDENT'], 5_000);
  const { name, email } = parseIdent(current.output);
  if (current.code === 0 && !isAgent(name, email)) return undefined;
  const history = await run(['git', 'log', '--no-merges', '-200', '--format=%an%x1f%ae'], 5_000);
  const human = history.output
    .split('\n')
    .map((line) => line.split('\u001F'))
    .find(([n = '', e = '']) => n !== '' && e !== '' && !isAgent(n, e));
  if (human === undefined) {
    return 'Git would commit as the agent: set `git config user.name` / `user.email` to the owner before committing.';
  }
  const [teamName = '', teamEmail = ''] = human;
  await run(['git', 'config', 'user.name', teamName], 5_000);
  await run(['git', 'config', 'user.email', teamEmail], 5_000);
  return `Git identity set to ${teamName} for this clone. Never credit the agent in commits, branches or PRs (\`bun run attribution\`).`;
}

const input = await readHookInput<SessionStartInput>();
const identityNote = await ensureTeamIdentity();

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
  ...(identityNote === undefined ? [] : [identityNote]),
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
