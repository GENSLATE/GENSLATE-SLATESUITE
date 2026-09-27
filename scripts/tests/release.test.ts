import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { formatStamp, freeArchivePath, prepareReleaseDir } from '../lib/release';

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

describe('formatStamp', () => {
  test('is YYYY-MM-DD_HH-MM in local time, zero-padded', () => {
    expect(formatStamp(new Date(2026, 0, 5, 7, 3))).toBe('2026-01-05_07-03');
    expect(formatStamp(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31_23-59');
  });
});

describe('freeArchivePath', () => {
  test('suffixes -2, -3 when a stamp is taken', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'genslate-release-'));
    dirs.push(dir);
    expect(await freeArchivePath(dir, '2026-09-26_14-05')).toBe(join(dir, '2026-09-26_14-05'));
    await mkdir(join(dir, '2026-09-26_14-05'));
    await writeFile(join(dir, '2026-09-26_14-05-2'), '');
    expect(await freeArchivePath(dir, '2026-09-26_14-05')).toBe(join(dir, '2026-09-26_14-05-3'));
  });
});

describe('prepareReleaseDir', () => {
  test('moves the previous build into .archive/<name>/<build time>', async () => {
    const root = await mkdtemp(join(tmpdir(), 'genslate-release-'));
    dirs.push(root);
    await mkdir(join(root, 'explorer'));
    await writeFile(join(root, 'explorer', 'old.zip'), 'old');
    const createdAt = new Date(2026, 8, 26, 14, 5).toISOString();
    await writeFile(join(root, 'explorer', 'manifest.json'), JSON.stringify({ createdAt }));

    const fresh = await prepareReleaseDir('explorer', root);

    expect(fresh).toBe(join(root, 'explorer'));
    expect(await readdir(fresh)).toEqual([]);
    const archived = join(root, '.archive', 'explorer', '2026-09-26_14-05');
    expect((await readdir(archived)).sort()).toEqual(['manifest.json', 'old.zip']);
  });

  test('creates the folder when there is nothing to archive', async () => {
    const root = await mkdtemp(join(tmpdir(), 'genslate-release-'));
    dirs.push(root);
    expect(await readdir(await prepareReleaseDir('suite', root))).toEqual([]);
    expect(await readdir(root)).toEqual(['suite']);
  });
});
