/** Path helpers that work for both POSIX and Windows paths (the UI never touches the disk). */

/** Windows-style path (`C:\…` or `\\server\…`). */
export function isWindowsPath(path: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(path) || path.startsWith('\\\\');
}

/** The last segment (`/a/b` → `b`, `C:\` → `C:\`, `/` → `/`). */
export function baseName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '');
  if (trimmed === '') return path === '' ? '' : path.slice(0, 1);
  if (/^[A-Za-z]:$/.test(trimmed)) return `${trimmed}\\`;
  const index = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  return index === -1 ? trimmed : trimmed.slice(index + 1);
}

/** The folder holding `path`, or `null` at a root. */
export function parentOf(path: string): string | null {
  const trimmed = path.replace(/[\\/]+$/, '');
  const index = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  if (index === -1) return null;
  if (index === 0) return trimmed.length > 1 ? '/' : null;
  const parent = trimmed.slice(0, index);
  return /^[A-Za-z]:$/.test(parent) ? `${parent}\\` : parent;
}

function normalize(path: string): string {
  const unified = path.replaceAll('\\', '/').replace(/\/+$/, '');
  return isWindowsPath(path) ? unified.toLowerCase() : unified;
}

export function samePath(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/** `path` is `folder` or somewhere below it. */
export function isInside(path: string, folder: string): boolean {
  const p = normalize(path);
  const f = normalize(folder);
  return p === f || p.startsWith(f === '' ? '/' : `${f}/`);
}

/** Whether any of the `changed` folders is `scope` or inside it. */
export function anyInside(changed: readonly string[], scope: string): boolean {
  return changed.some((folder) => isInside(folder, scope));
}

/** Replaces the home folder with `~` for display. */
export function tildify(path: string, home: string | null): string {
  if (home === null || home === '') return path;
  if (samePath(path, home)) return '~';
  if (isInside(path, home)) return `~${path.slice(home.replace(/[\\/]+$/, '').length)}`;
  return path;
}

/** Extensions the OS runs rather than shows (programs, scripts, shortcuts, installers). */
const RUNNABLE = new Set([
  'exe',
  'com',
  'bat',
  'cmd',
  'ps1',
  'psm1',
  'vbs',
  'vbe',
  'js',
  'jse',
  'wsf',
  'wsh',
  'hta',
  'msi',
  'msp',
  'scr',
  'cpl',
  'pif',
  'lnk',
  'url',
  'reg',
  'jar',
  'app',
  'command',
  'tool',
  'desktop',
  'sh',
  'bash',
  'zsh',
  'fish',
  'py',
  'pyw',
  'rb',
  'pl',
  'appimage',
  'run',
  'bin',
]);

/** Opening `path` with its default app would run it rather than show it. */
export function isRunnable(path: string): boolean {
  const name = baseName(path).toLowerCase();
  const dot = name.lastIndexOf('.');
  return dot > 0 && RUNNABLE.has(name.slice(dot + 1));
}

/** The kinds of shell a path may be pasted into; decides how it is quoted. */
export type QuoteStyle = 'posix' | 'powershell' | 'cmd';

/** A path ready to type at a prompt: quoted only when it needs to be. */
export function quotePath(path: string, style: QuoteStyle): string {
  if (/^[\w@%+=:,./\\-]+$/.test(path)) return path;
  switch (style) {
    case 'posix':
      return `'${path.replaceAll("'", `'\\''`)}'`;
    case 'powershell':
      return `'${path.replaceAll("'", "''")}'`;
    case 'cmd':
      return `"${path}"`;
  }
}
