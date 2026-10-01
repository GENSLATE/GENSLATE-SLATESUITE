/**
 * Staging: lays out portable GENSLATE folders (standalone app folders and the launcher suite)
 * before they are archived. Every staged folder has the shape `genslate-paths` detects:
 * `<root>/{programs?,other,storage}` — see other/documents/portability.md.
 */
import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

import type { DesktopApp } from './apps';
import { executablePaths, type MetadataStamp, stampMetadata } from './metadata';
import { fromRoot, TARGET_DIR } from './paths';
import { capture } from './run';
import { outputDir, type Target } from './targets';

/** What was built, for which target. */
export interface BuildContext {
  readonly app: DesktopApp;
  readonly target: Target;
  readonly profile: 'debug' | 'release';
}

/** Launcher template: the folder shape of an install dir (`programs/`, `storage/`, `other/`). */
export const INSTALL_TEMPLATE = fromRoot('desktop/launcher/installDir');

/** The built program: the executable, or the `.app` bundle on macOS. */
export function builtProgram(ctx: BuildContext): string {
  const dir = outputDir(TARGET_DIR, ctx.target, ctx.profile);
  const exe = executablePaths(ctx.app);
  switch (ctx.target.os) {
    case 'windows':
      return join(dir, exe.windows);
    case 'macos':
      return join(dir, 'bundle', 'macos', exe.macos);
    case 'linux':
      return join(dir, exe.linux);
  }
}

/** Copies the built program into `destDir` (keeps permissions and `.app` bundles intact). */
export async function copyProgram(ctx: BuildContext, destDir: string): Promise<string> {
  const program = builtProgram(ctx);
  try {
    await stat(program);
  } catch {
    throw new Error(`${program} does not exist — build it first (drop --skip-build)`);
  }
  await mkdir(destDir, { recursive: true });
  const target = join(destDir, basename(program));
  await cp(program, target, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true });
  return target;
}

/** The metadata values stamped into packaged copies. */
export async function metadataStamp(app: DesktopApp): Promise<MetadataStamp> {
  const commit = await capture(['git', 'rev-parse', '--short=7', 'HEAD']);
  const today = new Date();
  const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const sha = commit.code === 0 ? commit.stdout.trim() : 'local';
  return {
    version: app.version,
    build: `${date}.${sha}`,
    identifier: app.identifier,
    exe: executablePaths(app),
  };
}

/**
 * Writes one app's part of `other/`: its `<app>.*.toml` config defaults, its stamped launcher
 * metadata and its (empty) log folder. Never touches the repo's own files.
 */
export async function writeAppOther(
  app: DesktopApp,
  otherDir: string,
  stamp: MetadataStamp,
): Promise<void> {
  const appsDir = fromRoot('other/config/slatesuite/apps');
  const stagedApps = join(otherDir, 'config/slatesuite/apps');
  await mkdir(stagedApps, { recursive: true });
  for (const file of await readdir(appsDir)) {
    // `<app>.<kind>.toml`: the dot keeps `terminal` from matching `terminal-x`.
    if (file.startsWith(`${app.name}.`)) await cp(join(appsDir, file), join(stagedApps, file));
  }
  const source = Bun.file(fromRoot('other/config/slatesuite/metadata', `${app.name}.toml`));
  const metadata = (await source.exists()) ? await source.text() : '';
  await Bun.write(
    join(otherDir, 'config/slatesuite/metadata', `${app.name}.toml`),
    stampMetadata(metadata, stamp),
  );
  await mkdir(join(otherDir, 'logs/app-logs', app.name), { recursive: true });
}

/** Empty `databases/`, `cache/` and `logs/` roots plus the licences every archive must carry. */
export async function writeOtherSkeleton(otherDir: string): Promise<void> {
  for (const dir of ['databases', 'cache', 'logs/app-logs']) {
    await mkdir(join(otherDir, dir), { recursive: true });
  }
  await copyTree(fromRoot('other/licenses'), join(otherDir, 'licenses'));
}

/** `storage/` from the launcher template (`users/shared/{Desktop,Documents,…}`). */
export async function writeStorageSkeleton(storageDir: string): Promise<void> {
  await copyTree(join(INSTALL_TEMPLATE, 'storage'), storageDir);
}

/**
 * Copies `from` into `to` recursively, skipping `.gitkeep` placeholders (their folders are
 * still created). A missing `from` is a no-op.
 */
export async function copyTree(from: string, to: string): Promise<void> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await readdir(from, { withFileTypes: true });
  } catch {
    return;
  }
  await mkdir(to, { recursive: true });
  for (const entry of entries) {
    if (entry.name === '.gitkeep') continue;
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) await copyTree(source, target);
    else await cp(source, target, { preserveTimestamps: true });
  }
}
