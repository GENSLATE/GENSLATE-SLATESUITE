import { basename, dirname, join } from 'node:path';

import { fail } from './args';
import { ROOT } from './paths';

/** A Tauri desktop app under `desktop/<name>`. */
export interface DesktopApp {
  /** Folder name, also the moon project id (`example`). */
  readonly name: string;
  /** `desktop/<name>` (absolute). */
  readonly dir: string;
  /** `desktop/<name>/src-tauri` (absolute). */
  readonly tauriDir: string;
  /** `productName` from tauri.conf.json. */
  readonly productName: string;
  /** `mainBinaryName` (falls back to the Cargo package naming). */
  readonly binaryName: string;
  readonly identifier: string;
  /** Resolved app version (tauri.conf.json `version`, or the package.json it points to). */
  readonly version: string;
  /** Vite dev-server port from `build.devUrl`, if any. */
  readonly port: number | undefined;
}

interface TauriConf {
  productName?: string;
  mainBinaryName?: string;
  identifier?: string;
  version?: string;
  build?: { devUrl?: string };
}

/** Every `desktop/*` folder with a `src-tauri/tauri.conf.json`, sorted by name. */
export async function discoverApps(): Promise<DesktopApp[]> {
  const glob = new Bun.Glob('desktop/*/src-tauri/tauri.conf.json');
  const apps: DesktopApp[] = [];
  for await (const relative of glob.scan({ cwd: ROOT })) {
    apps.push(await readApp(join(ROOT, relative)));
  }
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

/** Resolves an app by name, or fails listing the available ones. */
export async function findApp(name: string): Promise<DesktopApp> {
  const apps = await discoverApps();
  const app = apps.find((candidate) => candidate.name === name);
  if (app === undefined) {
    const known = apps.map((candidate) => candidate.name).join(', ') || 'none';
    fail(`unknown app "${name}" (available: ${known})`);
  }
  return app;
}

/** `[app]` positional + `--all` flag → apps (default: `example`). */
export async function selectApps(
  positionals: readonly string[],
  all: boolean,
): Promise<DesktopApp[]> {
  if (all) return await discoverApps();
  if (positionals.length === 0) return [await findApp('example')];
  return await Promise.all(positionals.map(findApp));
}

async function readApp(confPath: string): Promise<DesktopApp> {
  const tauriDir = dirname(confPath);
  const dir = dirname(tauriDir);
  const name = basename(dir);
  const conf = (await Bun.file(confPath).json()) as TauriConf;
  return {
    name,
    dir,
    tauriDir,
    productName: conf.productName ?? name,
    binaryName: conf.mainBinaryName ?? `genslate-${name}`,
    identifier: conf.identifier ?? '',
    version: await resolveVersion(conf.version, tauriDir),
    port: parsePort(conf.build?.devUrl),
  };
}

async function resolveVersion(version: string | undefined, tauriDir: string): Promise<string> {
  if (version === undefined) return '0.0.0';
  if (!version.endsWith('.json')) return version;
  const pkg = (await Bun.file(join(tauriDir, version)).json()) as { version?: string };
  return pkg.version ?? '0.0.0';
}

function parsePort(devUrl: string | undefined): number | undefined {
  if (devUrl === undefined) return undefined;
  try {
    const port = Number(new URL(devUrl).port);
    return Number.isInteger(port) && port > 0 ? port : undefined;
  } catch {
    return undefined;
  }
}
