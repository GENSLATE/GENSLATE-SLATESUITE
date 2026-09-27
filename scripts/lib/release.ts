/**
 * Release folder layout: `release/<package>/` always holds the newest build. Before a new build
 * is written there, the previous one moves to `release/.archive/<package>/YYYY-MM-DD_HH-MM/`
 * (the time the previous build was made).
 */
import { mkdir, readdir, rename, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { log } from './log';
import { RELEASE_DIR, ROOT } from './paths';

const RETRIES = 5;
const RETRY_DELAY_MS = 400;

/**
 * Archives an existing `release/<name>/` and returns the (now free) folder path, created empty.
 * Retries while Windows holds the folder (a running exe, Explorer preview).
 */
export async function prepareReleaseDir(
  name: string,
  releaseDir: string = RELEASE_DIR,
): Promise<string> {
  const archiveDir = join(releaseDir, '.archive', name);
  const current = join(releaseDir, name);
  if (await hasContent(current)) {
    const stamp = formatStamp(await buildTime(current));
    const target = await freeArchivePath(archiveDir, stamp);
    await mkdir(archiveDir, { recursive: true });
    await renameWithRetry(current, target);
    log.info(`archived previous build → ${relative(ROOT, target)}`);
  }
  await mkdir(current, { recursive: true });
  return current;
}

/** `YYYY-MM-DD_HH-MM` in local time (sorts chronologically). */
export function formatStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

/** `<dir>/<stamp>`, or `<stamp>-2`, `-3`… if two builds share a minute. */
export async function freeArchivePath(dir: string, stamp: string): Promise<string> {
  for (let attempt = 1; ; attempt += 1) {
    const candidate = join(dir, attempt === 1 ? stamp : `${stamp}-${attempt}`);
    if (!(await exists(candidate))) return candidate;
  }
}

/** The previous build's `manifest.json` `createdAt`, else the folder's modification time. */
async function buildTime(dir: string): Promise<Date> {
  const manifest = Bun.file(join(dir, 'manifest.json'));
  if (await manifest.exists()) {
    try {
      const parsed: unknown = await manifest.json();
      if (typeof parsed === 'object' && parsed !== null && 'createdAt' in parsed) {
        const date = new Date(String(parsed.createdAt));
        if (!Number.isNaN(date.getTime())) return date;
      }
    } catch {
      // A corrupt manifest just means we fall back to the folder time.
    }
  }
  return (await stat(dir)).mtime;
}

async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : '';
      const busy = code === 'EBUSY' || code === 'EPERM' || code === 'EACCES';
      if (!busy || attempt >= RETRIES) {
        throw new Error(
          `could not archive ${relative(ROOT, from)} (${code || 'error'}): close any running copy or window showing it`,
        );
      }
      await Bun.sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

async function hasContent(dir: string): Promise<boolean> {
  try {
    return (await readdir(dir)).length > 0;
  } catch {
    return false;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
