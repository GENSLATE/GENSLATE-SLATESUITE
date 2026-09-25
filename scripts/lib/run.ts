import { relative } from 'node:path';

import { log } from './log';
import { ROOT } from './paths';

export interface RunOptions {
  /** Working directory. Default: the repo root. */
  readonly cwd?: string;
  /** Extra environment variables (merged over `process.env`). */
  readonly env?: Readonly<Record<string, string>>;
  /** Don't echo the command line. */
  readonly quiet?: boolean;
}

/** Thrown by `runOrThrow` (and caught by `defineCommand`, which exits with `code`). */
export class CommandFailedError extends Error {
  readonly argv: readonly string[];
  readonly code: number;

  constructor(argv: readonly string[], code: number) {
    super(`\`${argv.join(' ')}\` exited with code ${code}`);
    this.name = 'CommandFailedError';
    this.argv = argv;
    this.code = code;
  }
}

/** Runs a command with inherited stdio and resolves with its exit code. */
export async function run(argv: readonly string[], options: RunOptions = {}): Promise<number> {
  const cwd = options.cwd ?? ROOT;
  if (options.quiet !== true)
    log.command(argv, cwd === ROOT ? undefined : relative(ROOT, cwd) || '.');
  try {
    const child = Bun.spawn([...argv], {
      cwd,
      env: { ...process.env, ...options.env },
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    });
    return await child.exited;
  } catch (error) {
    // Typically ENOENT: the executable is not installed.
    log.error(
      `could not start ${argv[0] ?? '?'}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 127;
  }
}

/** Like `run`, but throws `CommandFailedError` on a non-zero exit. */
export async function runOrThrow(argv: readonly string[], options: RunOptions = {}): Promise<void> {
  const code = await run(argv, options);
  if (code !== 0) throw new CommandFailedError(argv, code);
}

export interface Captured {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** Runs a command silently and captures its output. Never throws. */
export async function capture(
  argv: readonly string[],
  options: Omit<RunOptions, 'quiet'> = {},
): Promise<Captured> {
  try {
    const child = Bun.spawn([...argv], {
      cwd: options.cwd ?? ROOT,
      env: { ...process.env, ...options.env },
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    return { code, stdout, stderr };
  } catch (error) {
    return {
      code: 127,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}
