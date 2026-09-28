/**
 * `bun run attribution` — rejects commits, branches and PR bodies that credit an agent as author
 * (agent git identity, Co-Authored-By / session trailers, session links, "Generated with" footers).
 * Run by lefthook (commit-msg, pre-push) and CI; see other/documents/contributing.md#authorship.
 */
import { readFileSync } from 'node:fs';

import { defineCommand } from '../lib/args';
import {
  type AttributionFinding,
  checkBranch,
  checkCommit,
  checkIdentity,
  checkText,
  LOG_FORMAT,
  parseIdent,
  parseLog,
} from '../lib/attribution';
import { log } from '../lib/log';
import { capture } from '../lib/run';

async function git(args: readonly string[]): Promise<string> {
  const result = await capture(['git', ...args]);
  if (result.code !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

async function checkPendingCommit(messageFile: string): Promise<AttributionFinding[]> {
  const author = parseIdent(await git(['var', 'GIT_AUTHOR_IDENT']));
  const committer = parseIdent(await git(['var', 'GIT_COMMITTER_IDENT']));
  return [
    ...checkIdentity('new commit', 'author', author.name, author.email),
    ...checkIdentity('new commit', 'committer', committer.name, committer.email),
    ...checkText('new commit', readFileSync(messageFile, 'utf8')),
  ];
}

await defineCommand({
  name: 'attribution',
  summary: 'Reject commits, branches and PR bodies that credit an agent as author.',
  usage:
    '[--message <file>] [--range <base..head>] [--branch <name> | --current-branch] [--body-env <VAR>]',
  options: {
    message: {
      type: 'string',
      description: 'Check a commit message file and the identity git will commit as (commit-msg).',
    },
    range: {
      type: 'string',
      description: 'Check every commit in a git range, e.g. origin/main..HEAD (pre-push, CI).',
    },
    branch: { type: 'string', description: 'Check a branch name.' },
    'current-branch': { type: 'boolean', description: 'Check the checked-out branch name.' },
    'body-env': {
      type: 'string',
      description: 'Check the text in this environment variable (a PR body in CI).',
    },
  },
  details:
    'Using agent tooling is fine; crediting it is not. Plain mentions of .claude/ or CLAUDE.md pass.\n' +
    'Fix a rejected commit with `git commit --amend` (or `git rebase` for older ones) and set\n' +
    '`git config user.name` / `user.email` to your own identity.',
  async run({ values }) {
    const findings: AttributionFinding[] = [];
    if (values.message !== undefined) findings.push(...(await checkPendingCommit(values.message)));
    if (values.range !== undefined) {
      const commits = parseLog(await git(['log', `--format=${LOG_FORMAT}`, values.range]));
      findings.push(...commits.flatMap(checkCommit));
    }
    const branch = values['current-branch']
      ? (await git(['branch', '--show-current'])).trim()
      : values.branch;
    if (branch !== undefined && branch !== '') findings.push(...checkBranch(branch));
    const bodyEnv = values['body-env'];
    if (bodyEnv !== undefined) findings.push(...checkText('PR body', process.env[bodyEnv] ?? ''));

    if (findings.length === 0) {
      log.success('no agent attribution found');
      return;
    }
    for (const { where, reason } of findings) log.error(`${where}: ${reason}`);
    log.error('GENSLATE commits, branches and PRs must not credit an agent as author.');
    process.exitCode = 1;
  },
});
