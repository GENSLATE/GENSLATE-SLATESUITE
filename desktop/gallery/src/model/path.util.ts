/**
 * Path helpers for the absolute paths the backend sends: POSIX (`/home/me`) and Windows
 * (`C:\Users\me`, `\\server\share`). Pure string work; the backend validates everything.
 */

/** The separator a path uses. */
export function separatorOf(path: string): '/' | '\\' {
  return /^[A-Za-z]:|^\\\\/.test(path) || (path.includes('\\') && !path.includes('/')) ? '\\' : '/';
}

/** The last segment; the whole path at a root. */
export function baseName(path: string): string {
  const sep = separatorOf(path);
  const trimmed = trimTrailing(path, sep);
  const index = trimmed.lastIndexOf(sep);
  const name = index === -1 ? trimmed : trimmed.slice(index + 1);
  return name === '' ? path : name;
}

/** The containing folder, or `null` at a root. */
export function parentOf(path: string): string | null {
  const sep = separatorOf(path);
  const trimmed = trimTrailing(path, sep);
  const index = trimmed.lastIndexOf(sep);
  if (index === -1) return null;
  const parent = trimmed.slice(0, index);
  if (sep === '/') return trimmed === '' ? null : parent === '' ? '/' : parent;
  // `C:` → `C:\`; `\\server` (a UNC host) has no parent to browse.
  if (/^[A-Za-z]:$/.test(parent)) return `${parent}\\`;
  if (/^\\\\[^\\]*$/.test(parent)) return null;
  if (/^[A-Za-z]:$/.test(trimmed)) return null;
  return parent;
}

/** `dir` + `name` with the right separator. */
export function joinPath(dir: string, name: string): string {
  const sep = separatorOf(dir);
  return dir.endsWith(sep) ? `${dir}${name}` : `${dir}${sep}${name}`;
}

/** `true` when `path` is `folder` or inside it. */
export function isInside(path: string, folder: string): boolean {
  const sep = separatorOf(folder);
  const base = trimTrailing(folder, sep);
  return path === folder || path === base || path.startsWith(`${base}${sep}`);
}

function trimTrailing(path: string, sep: string): string {
  if (path === sep || /^[A-Za-z]:\\$/.test(path)) return sep === '/' ? '' : path.slice(0, 2);
  return path.endsWith(sep) ? path.slice(0, -1) : path;
}
