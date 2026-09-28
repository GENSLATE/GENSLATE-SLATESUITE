/**
 * Authorship guard: GENSLATE code is authored by the GENSLATE team. Agent tooling may be used to
 * write it (`.claude/`, `CLAUDE.md`), but no commit, branch or PR may credit an agent as its
 * author. These pure checks back `bun run attribution` (commit-msg / pre-push hooks and CI).
 */

/** One reason a commit, branch or PR body was rejected. */
export interface AttributionFinding {
  /** What was checked, e.g. `commit 1a2b3c4`, `branch`, `PR body`. */
  readonly where: string;
  /** Why it was rejected. */
  readonly reason: string;
}

/** A commit as read from `git log`. */
export interface CommitIdentity {
  readonly sha: string;
  readonly authorName: string;
  readonly authorEmail: string;
  readonly committerName: string;
  readonly committerEmail: string;
  readonly message: string;
}

const TEXT_RULES: readonly { readonly pattern: RegExp; readonly reason: string }[] = [
  {
    pattern: /^co-authored-by:.*(claude|anthropic\.com)/im,
    reason: 'a Co-Authored-By trailer credits an agent',
  },
  { pattern: /^claude-session:/im, reason: 'a Claude-Session trailer' },
  { pattern: /claude\.ai\/code/i, reason: 'an agent session link' },
  {
    pattern: /generated (with|by) \[?claude/i,
    reason: 'a "Generated with/by" agent footer',
  },
];

/** Findings for a commit message or PR body. Plain mentions of the `.claude/` tooling pass. */
export function checkText(where: string, text: string): AttributionFinding[] {
  return TEXT_RULES.filter(({ pattern }) => pattern.test(text)).map(({ reason }) => ({
    where,
    reason,
  }));
}

/** Findings for a git identity (`name <email>`) used as author or committer. */
export function checkIdentity(
  where: string,
  role: 'author' | 'committer',
  name: string,
  email: string,
): AttributionFinding[] {
  const agent = /claude/i.test(name) || /@anthropic\.com$/i.test(email.trim());
  return agent ? [{ where, reason: `${role} is ${name} <${email}>` }] : [];
}

/** Findings for a branch name. */
export function checkBranch(name: string): AttributionFinding[] {
  return /claude/i.test(name)
    ? [{ where: 'branch', reason: `"${name}" names an agent; rename the branch` }]
    : [];
}

/** Findings for one commit: author, committer and message. */
export function checkCommit(commit: CommitIdentity): AttributionFinding[] {
  const where = `commit ${commit.sha.slice(0, 7)}`;
  return [
    ...checkIdentity(where, 'author', commit.authorName, commit.authorEmail),
    ...checkIdentity(where, 'committer', commit.committerName, commit.committerEmail),
    ...checkText(where, commit.message),
  ];
}

const FIELD = '\u001F';
const RECORD = '\u001E';

/** `git log` format that `parseLog` reads. */
export const LOG_FORMAT = '%H%x1f%an%x1f%ae%x1f%cn%x1f%ce%x1f%B%x1e';

/** Parses `git log --format=LOG_FORMAT` output. */
export function parseLog(output: string): CommitIdentity[] {
  return output
    .split(RECORD)
    .map((record) => record.replace(/^\n/, ''))
    .filter((record) => record.trim() !== '')
    .map((record) => {
      const [
        sha = '',
        authorName = '',
        authorEmail = '',
        committerName = '',
        committerEmail = '',
        message = '',
      ] = record.split(FIELD);
      return { sha, authorName, authorEmail, committerName, committerEmail, message };
    });
}

/** Splits `git var GIT_AUTHOR_IDENT` output (`Name <email> 1700000000 +0000`). */
export function parseIdent(ident: string): { readonly name: string; readonly email: string } {
  const match = /^(.*?)\s*<([^>]*)>/.exec(ident.trim());
  return { name: match?.[1] ?? ident.trim(), email: match?.[2] ?? '' };
}
