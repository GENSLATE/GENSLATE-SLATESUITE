/**
 * `bun run version <patch|minor|major|x.y.z> [--dry-run]` — bump the version everywhere.
 */
import { relative } from 'node:path';

import { defineCommand, fail } from '../lib/args';
import { log } from '../lib/log';
import { fromRoot, ROOT } from '../lib/paths';
import { run } from '../lib/run';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

await defineCommand({
  name: 'version',
  summary:
    'Bump the version in every package.json, the Cargo workspace and literal tauri.conf.json versions.',
  usage: '<patch|minor|major|x.y.z> [--dry-run]',
  options: {
    'dry-run': { type: 'boolean', short: 'n', description: 'Print the changes without writing.' },
  },
  details: `
Apps whose tauri.conf.json has \`"version": "../package.json"\` follow their package.json automatically.`,
  async run({ values, positionals }) {
    const bump = positionals[0] ?? fail('missing <patch|minor|major|x.y.z>');
    const rootPkg = (await Bun.file(fromRoot('package.json')).json()) as { version?: string };
    const current = rootPkg.version ?? fail('root package.json has no version');
    const next = nextVersion(current, bump);
    const dryRun = values['dry-run'];
    log.title(`${current} → ${next}${dryRun ? ' (dry run)' : ''}`);

    const edits: { file: string; update: (text: string) => string }[] = [];
    for (const pattern of ['package.json', '{desktop,packages,webapp}/*/package.json']) {
      for await (const file of new Bun.Glob(pattern).scan({ cwd: ROOT })) {
        edits.push({
          file,
          update: (text) => text.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`),
        });
      }
    }
    edits.push({
      file: 'Cargo.toml',
      update: (text) =>
        text.replace(/(\[workspace\.package\][^[]*?\nversion\s*=\s*")[^"]+(")/, `$1${next}$2`),
    });
    for await (const file of new Bun.Glob('desktop/*/src-tauri/tauri.conf.json').scan({
      cwd: ROOT,
    })) {
      // Only literal versions; a path ("../package.json") already follows package.json.
      edits.push({
        file,
        update: (text) => text.replace(/("version"\s*:\s*")\d[^"]*(")/, `$1${next}$2`),
      });
    }

    for (const { file, update } of edits.sort((a, b) => a.file.localeCompare(b.file))) {
      const path = fromRoot(file);
      const before = await Bun.file(path).text();
      const after = update(before);
      if (after === before) continue;
      if (!dryRun) await Bun.write(path, after);
      log.info(relative(ROOT, path));
    }
    if (!dryRun) {
      // Refresh workspace member versions in Cargo.lock.
      await run(['cargo', 'update', '--workspace', '--offline']);
    }
    log.success(`version ${next}`);
  },
});

function nextVersion(current: string, bump: string): string {
  if (SEMVER.test(bump)) return bump;
  const match = SEMVER.exec(current) ?? fail(`current version "${current}" is not semver`);
  const [major, minor, patch] = [Number(match[1]), Number(match[2]), Number(match[3])];
  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return fail(`invalid bump "${bump}" (use patch, minor, major or x.y.z)`);
  }
}
