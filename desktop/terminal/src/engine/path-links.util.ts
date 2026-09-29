/**
 * Finds file paths in a line of terminal output so they can be opened with a modifier-click:
 * absolute POSIX and Windows paths, `~/…`, and relative paths that start with `./` or `../` or
 * name a file with an extension (`src/main.rs:12:5`).
 */

export interface PathMatch {
  /** 0-based column where the match starts. */
  readonly start: number;
  readonly text: string;
  /** The path without a trailing `:line:column`. */
  readonly path: string;
  readonly line: number | null;
}

const PATH =
  /(?:[A-Za-z]:\\[^\s:"'<>|*?]+|~?\/[\w.@+-]+(?:\/[\w.@+-]*)*|\.{1,2}\/[\w.@+/-]+|[\w@+-]+(?:\/[\w.@+-]+)*\.[A-Za-z][\w]{0,7})(?::(\d+)(?::\d+)?)?/g;

/** Trailing punctuation that belongs to the sentence, not the path. */
const TRAILING = /[.,;:)\]}'"]+$/;

export function findPaths(line: string): readonly PathMatch[] {
  const out: PathMatch[] = [];
  for (const match of line.matchAll(PATH)) {
    const full = match[0];
    const start = match.index;
    // Skip URLs (the web-links add-on handles them) and bare version numbers such as 1.2.3.
    const before = line.slice(Math.max(0, start - 3), start);
    if (before.endsWith('://') || before.endsWith(':/') || /^\d+(\.\d+)+$/.test(full)) continue;
    const trimmed = full.replace(TRAILING, '');
    if (trimmed.length < 2) continue;
    const lineNumber = match[1] === undefined ? null : Number.parseInt(match[1], 10);
    const path = trimmed.replace(/:\d+(?::\d+)?$/, '');
    // A lone word with an extension must look like a file name, not "e.g" or "v1.2".
    if (!/[\\/]/.test(path) && !/^[\w@+-]{1,}\.[A-Za-z]{1,8}$/.test(path)) continue;
    out.push({ start, text: trimmed, path, line: lineNumber });
  }
  return out;
}

/** `path` made absolute against `cwd` (the UI never touches the disk). */
export function resolvePath(path: string, cwd: string | null, home: string | null): string {
  if (/^[A-Za-z]:\\/.test(path) || path.startsWith('/')) return path;
  if (path.startsWith('~/') && home !== null) return joinTo(home, path.slice(2));
  if (cwd === null) return path;
  return joinTo(cwd, path.replace(/^\.\//, ''));
}

function joinTo(folder: string, relative: string): string {
  const windows = /^[A-Za-z]:\\/.test(folder);
  const sep = windows ? '\\' : '/';
  const parts = folder.replace(/[\\/]+$/, '').split(/[\\/]/);
  for (const part of relative.split(/[\\/]/)) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (parts.length > 1) parts.pop();
    } else {
      parts.push(part);
    }
  }
  const joined = parts.join(sep);
  return joined === '' ? sep : joined;
}
