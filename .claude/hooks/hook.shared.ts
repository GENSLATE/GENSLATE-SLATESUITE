/**
 * Shared helpers for GENSLATE's Claude Code hooks.
 *
 * Every hook is **fail-open**: if stdin is missing or malformed, or a tool is not installed,
 * the hook exits 0 and Claude Code carries on. Only an explicit policy decision blocks (exit 2).
 * https://code.claude.com/docs/en/hooks
 */

import { relative, resolve, sep } from 'node:path';

/** Fields Claude Code sends to every hook on stdin. */
export interface HookInputBase {
  readonly session_id?: string;
  readonly cwd?: string;
  readonly hook_event_name?: string;
  readonly permission_mode?: string;
}

/** `tool_input` for the file tools (Edit, Write, MultiEdit, NotebookEdit). */
export interface FileToolInput {
  readonly file_path?: string;
  readonly notebook_path?: string;
}

export interface ToolHookInput extends HookInputBase {
  readonly tool_name?: string;
  readonly tool_input?: FileToolInput;
}

export interface SessionStartInput extends HookInputBase {
  readonly source?: 'startup' | 'resume' | 'clear' | 'compact' | 'fork';
}

/** Absolute repository root (Claude Code exports `CLAUDE_PROJECT_DIR` to hooks). */
export const projectDir: string = resolve(
  process.env['CLAUDE_PROJECT_DIR'] ?? resolve(import.meta.dir, '..', '..'),
);

/** Reads and parses the hook's JSON stdin; `undefined` when it is empty or invalid. */
export async function readHookInput<T extends HookInputBase>(): Promise<T | undefined> {
  try {
    const text = await Bun.stdin.text();
    if (text.trim() === '') {
      return undefined;
    }
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null ? (parsed as T) : undefined;
  } catch {
    return undefined;
  }
}

/** The edited file's path, relative to the repo root with `/` separators (or `undefined`). */
export function editedFile(input: ToolHookInput | undefined): string | undefined {
  const raw = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
  if (raw === undefined || raw === '') {
    return undefined;
  }
  const rel = relative(projectDir, resolve(input?.cwd ?? projectDir, raw));
  if (rel.startsWith('..')) {
    return undefined; // outside the repository: not our business
  }
  return rel.split(sep).join('/');
}

/** Runs a command with a timeout; resolves to its exit code (or `undefined` if it could not start). */
export async function run(
  cmd: readonly string[],
  timeoutMs = 20_000,
): Promise<{ readonly code: number | undefined; readonly output: string }> {
  try {
    const proc = Bun.spawn([...cmd], {
      cwd: projectDir,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: timeoutMs,
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { code, output: `${stdout}${stderr}`.trim() };
  } catch {
    return { code: undefined, output: '' };
  }
}

/** Blocks the pending tool call: exit code 2 feeds `reason` (stderr) back to Claude. */
export function block(reason: string): never {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}

/** Finishes without an opinion. */
export function allow(): never {
  process.exit(0);
}
