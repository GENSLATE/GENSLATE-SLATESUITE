#!/usr/bin/env bun
/**
 * Claude Code status line: `❄ GENSLATE  <branch>●  <model>  <ctx%>` in Nord colours.
 * Reads the session JSON on stdin; prints one line. Never throws.
 * https://code.claude.com/docs/en/statusline
 */

interface StatusInput {
  readonly model?: { readonly display_name?: string };
  readonly workspace?: { readonly current_dir?: string; readonly project_dir?: string };
  readonly context_window?: { readonly used_percentage?: number };
}

// Nord palette (truecolor ANSI).
const rgb = (hex: string): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `\u001B[38;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}m`;
};
const RESET = '\u001B[0m';
const frost = rgb('#88C0D0');
const snow = rgb('#D8DEE9');
const muted = rgb('#616E88');
const yellow = rgb('#EBCB8B');
const red = rgb('#BF616A');
const green = rgb('#A3BE8C');

async function readInput(): Promise<StatusInput> {
  try {
    const parsed: unknown = JSON.parse(await Bun.stdin.text());
    return typeof parsed === 'object' && parsed !== null ? (parsed as StatusInput) : {};
  } catch {
    return {};
  }
}

function git(args: readonly string[], cwd: string): string {
  try {
    const result = Bun.spawnSync(['git', ...args], { cwd, stdout: 'pipe', stderr: 'ignore' });
    return result.exitCode === 0 ? result.stdout.toString().trim() : '';
  } catch {
    return '';
  }
}

const input = await readInput();
const cwd = input.workspace?.current_dir ?? input.workspace?.project_dir ?? process.cwd();
const branch = git(['branch', '--show-current'], cwd);
const dirty = git(['status', '--porcelain'], cwd) !== '';
const model = input.model?.display_name ?? 'Claude';
const used = input.context_window?.used_percentage;

const parts = [`${frost}❄ GENSLATE${RESET}`];
if (branch !== '') {
  parts.push(`${snow}${branch}${dirty ? `${yellow}●` : `${green}✓`}${RESET}`);
}
parts.push(`${muted}${model}${RESET}`);
if (typeof used === 'number') {
  const colour = used >= 80 ? red : used >= 60 ? yellow : muted;
  parts.push(`${colour}ctx ${Math.round(used)}%${RESET}`);
}

process.stdout.write(`${parts.join(`${muted}  ${RESET}`)}\n`);
