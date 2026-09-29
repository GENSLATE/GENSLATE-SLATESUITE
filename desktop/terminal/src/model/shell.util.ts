/**
 * Typing paths and commands for a particular shell: how to quote a path, how WSL sees a
 * Windows path, and how to change folder (cmd needs `/d` to change drive too).
 */
import type { ShellKind } from '../ipc/terminal.types';
import { isWindowsPath, type QuoteStyle, quotePath } from './path.util';

export function quoteStyleFor(kind: ShellKind): QuoteStyle {
  switch (kind) {
    case 'pwsh':
    case 'powershell':
      return 'powershell';
    case 'cmd':
      return 'cmd';
    default:
      return 'posix';
  }
}

/** `C:\Users\you` as WSL sees it: `/mnt/c/Users/you`. */
export function wslPath(path: string): string {
  const drive = /^([A-Za-z]):[\\/]?(.*)$/.exec(path);
  if (drive === null) return path.replaceAll('\\', '/');
  const [, letter = 'c', rest = ''] = drive;
  const tail = rest.replaceAll('\\', '/');
  return `/mnt/${letter.toLowerCase()}${tail === '' ? '' : `/${tail}`}`;
}

/** `path` ready to type into a `kind` shell (translated for WSL, quoted when needed). */
export function shellPath(path: string, kind: ShellKind): string {
  const target = kind === 'wsl' && isWindowsPath(path) ? wslPath(path) : path;
  return quotePath(target, quoteStyleFor(kind));
}

/** The command that changes a `kind` shell's folder to `path`. */
export function cdCommand(path: string, kind: ShellKind): string {
  const target = shellPath(path, kind);
  return kind === 'cmd' ? `cd /d ${target}` : `cd ${target}`;
}
