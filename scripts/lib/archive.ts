/**
 * Portable archives with the OS's own tools, which keep what matters per platform:
 * Windows `tar.exe -a` (zip), macOS `ditto` (zip that keeps `.app` bundles, symlinks and
 * permissions), Linux `tar -czf` (keeps the executable bit).
 *
 * `Bun.Archive` only writes tar/tar.gz and can't set file modes, so it isn't used here.
 */
import { basename, dirname } from 'node:path';
import { runOrThrow } from './run';
import type { TargetOs } from './targets';

/** Archive extension used for `os`. */
export function archiveExtension(os: TargetOs): '.zip' | '.tar.gz' {
  return os === 'linux' ? '.tar.gz' : '.zip';
}

/** Archives the folder `sourceDir` (as its top-level entry) into `outFile`. */
export async function createArchive(
  sourceDir: string,
  outFile: string,
  os: TargetOs,
): Promise<void> {
  const parent = dirname(sourceDir);
  const name = basename(sourceDir);
  if (os === 'macos') {
    await runOrThrow(['ditto', '-c', '-k', '--sequesterRsrc', '--keepParent', sourceDir, outFile], {
      quiet: true,
    });
  } else if (os === 'windows') {
    // System32 tar is bsdtar; `-a` picks the format from the .zip extension.
    await runOrThrow([windowsTar(), '-a', '-c', '-f', outFile, '-C', parent, name], {
      quiet: true,
    });
  } else {
    await runOrThrow(['tar', '-czf', outFile, '-C', parent, name], { quiet: true });
  }
}

/** Git Bash puts GNU tar first on PATH, which can't write zips — use the Windows one. */
function windowsTar(): string {
  const root = process.env['SystemRoot'] ?? 'C:\\Windows';
  return `${root}\\System32\\tar.exe`;
}
