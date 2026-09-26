/**
 * `bun run package [app|--all] [--debug] [--skip-build]` — build installers and collect them
 * into `release/<app>/<version>/` with `checksums.sha256` and `manifest.json`.
 */
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { type DesktopApp, selectApps } from '../lib/apps';
import { defineCommand } from '../lib/args';
import { color, log } from '../lib/log';
import { RELEASE_DIR, ROOT, TARGET_DIR } from '../lib/paths';
import { capture, runOrThrow } from '../lib/run';

/** Installer / archive formats produced by the Tauri bundler. */
const ARTIFACT = /\.(deb|rpm|AppImage|dmg|app|msi|exe|app\.tar\.gz|AppImage\.tar\.gz|sig|zip)$/;

interface Artifact {
  readonly file: string;
  readonly kind: string;
  readonly bytes: number;
  readonly sha256: string | undefined;
}

await defineCommand({
  name: 'package',
  summary:
    'Build release installers with `tauri build` and collect them into release/<app>/<version>/.',
  usage: '[app...] [--all] [--debug] [--skip-build]',
  options: {
    all: { type: 'boolean', short: 'a', description: 'Package every app under desktop/.' },
    debug: { type: 'boolean', short: 'd', description: 'Debug build (target/debug/bundle).' },
    'skip-build': { type: 'boolean', description: 'Only collect bundles that already exist.' },
  },
  details: `
Output
  release/<app>/<version>/<installers>
  release/<app>/<version>/checksums.sha256   (sha256sum -c compatible)
  release/<app>/<version>/manifest.json      (app, version, identifier, target, files)`,
  async run({ values, positionals }) {
    const apps = await selectApps(positionals, values.all);
    const profile = values.debug ? 'debug' : 'release';
    for (const app of apps) {
      log.title(`Packaging ${app.productName} ${app.version} (${profile})`);
      const startedAt = Date.now();
      if (!values['skip-build']) {
        await runOrThrow(['bun', 'run', 'tauri', 'build', ...(values.debug ? ['--debug'] : [])], {
          cwd: app.dir,
        });
      }
      const bundleDir = join(TARGET_DIR, profile, 'bundle');
      const sources = await findBundles(bundleDir, app, values['skip-build'] ? 0 : startedAt);
      if (sources.length === 0)
        throw new Error(`no bundles for ${app.name} in ${relative(ROOT, bundleDir)}`);
      const outDir = join(RELEASE_DIR, app.name, app.version);
      await rm(outDir, { recursive: true, force: true });
      await mkdir(outDir, { recursive: true });
      const artifacts: Artifact[] = [];
      for (const source of sources) artifacts.push(await collect(source, bundleDir, outDir));
      await writeChecksums(outDir, artifacts);
      await writeManifest(outDir, app, profile, artifacts);
      for (const artifact of artifacts)
        log.info(
          `${artifact.kind.padEnd(9)} ${artifact.file} ${color.dim(formatBytes(artifact.bytes))}`,
        );
      log.success(`${relative(ROOT, outDir)}`);
    }
  },
});

/** Top-level installers in `bundle/<kind>/` belonging to `app` (by name, and by mtime after a build). */
async function findBundles(
  bundleDir: string,
  app: DesktopApp,
  newerThan: number,
): Promise<string[]> {
  const names = [app.productName, app.binaryName].map(normalise);
  let kinds: string[];
  try {
    kinds = await readdir(bundleDir);
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const kind of kinds) {
    const kindDir = join(bundleDir, kind);
    if (!(await stat(kindDir)).isDirectory()) continue;
    for (const entry of await readdir(kindDir)) {
      if (!ARTIFACT.test(entry)) continue;
      if (!names.some((name) => normalise(entry).startsWith(name))) continue;
      const path = join(kindDir, entry);
      if ((await stat(path)).mtimeMs + 1000 < newerThan) continue;
      found.push(path);
    }
  }
  return found.sort();
}

async function collect(source: string, bundleDir: string, outDir: string): Promise<Artifact> {
  const kind = relative(bundleDir, source).split(/[/\\]/)[0] ?? 'bundle';
  const target = join(outDir, basename(source));
  await cp(source, target, { recursive: true, preserveTimestamps: true });
  const info = await stat(target);
  if (info.isDirectory()) {
    // macOS .app bundles are folders: size them, but only files get checksums.
    const size = await capture(['du', '-sk', target]);
    return {
      file: basename(target),
      kind,
      bytes: Number(size.stdout.split(/\s/)[0] ?? 0) * 1024,
      sha256: undefined,
    };
  }
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(await Bun.file(target).arrayBuffer());
  return { file: basename(target), kind, bytes: info.size, sha256: hasher.digest('hex') };
}

async function writeChecksums(outDir: string, artifacts: readonly Artifact[]): Promise<void> {
  const lines = artifacts.flatMap((artifact) =>
    artifact.sha256 === undefined ? [] : [`${artifact.sha256}  ${artifact.file}`],
  );
  await Bun.write(join(outDir, 'checksums.sha256'), `${lines.join('\n')}\n`);
}

async function writeManifest(
  outDir: string,
  app: DesktopApp,
  profile: string,
  artifacts: readonly Artifact[],
): Promise<void> {
  const commit = await capture(['git', 'rev-parse', 'HEAD']);
  const manifest = {
    app: app.name,
    productName: app.productName,
    identifier: app.identifier,
    version: app.version,
    profile,
    target: { os: process.platform, arch: process.arch },
    commit: commit.code === 0 ? commit.stdout.trim() : null,
    createdAt: new Date().toISOString(),
    files: artifacts,
  };
  await Bun.write(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function normalise(value: string): string {
  return value.toLowerCase().replaceAll(/[\s_]+/g, '-');
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
