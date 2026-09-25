import { join, resolve } from 'node:path';

/** Absolute path of the repository root. */
export const ROOT = resolve(import.meta.dir, '..', '..');

/** `ROOT/...segments`. */
export const fromRoot = (...segments: string[]): string => join(ROOT, ...segments);

/** Where `bun run package` puts installers. */
export const RELEASE_DIR = fromRoot('release');

/** The shared Cargo target directory. */
export const TARGET_DIR = fromRoot('target');
