/**
 * `bun run build [app|--all] [--web] [--debug]` — production builds.
 */

import { selectApps } from '../lib/apps';
import { defineCommand } from '../lib/args';
import { log } from '../lib/log';
import { moonAvailable, moonRun } from '../lib/moon';
import { runOrThrow } from '../lib/run';

await defineCommand({
  name: 'build',
  summary:
    'Build Tauri apps (frontend + Rust + installers in target/<profile>/bundle), or only their web UI.',
  usage: '[app...] [--all] [--web] [--debug]',
  options: {
    all: {
      type: 'boolean',
      short: 'a',
      description: 'Build every app under desktop/ (the default).',
    },
    web: { type: 'boolean', short: 'w', description: 'Frontend only (vite build → dist/).' },
    debug: {
      type: 'boolean',
      short: 'd',
      description: 'Debug Rust build (`tauri build --debug`).',
    },
    direct: { type: 'boolean', description: 'Skip moon and run bun directly.' },
  },
  details: `
Use \`bun run package\` to collect the installers into release/<app>/<version>/.`,
  async run({ values, positionals }) {
    // No app named = every app (`bun run build`); `--all` is accepted for symmetry with `package`.
    const apps = await selectApps(positionals, values.all || positionals.length === 0);
    const viaMoon = !values.direct && !values.debug && (await moonAvailable());
    for (const app of apps) {
      log.title(`Building ${app.productName}${values.web ? ' (web)' : ''}`);
      if (viaMoon) {
        const code = await moonRun([`${app.name}:${values.web ? 'web-build' : 'build'}`]);
        if (code !== 0) throw new Error(`${app.name} build failed (exit ${code})`);
      } else if (values.web) {
        await runOrThrow(['bun', 'run', 'vite:build'], { cwd: app.dir });
      } else {
        await runOrThrow(['bun', 'run', 'tauri', 'build', ...(values.debug ? ['--debug'] : [])], {
          cwd: app.dir,
        });
      }
      log.success(`${app.name} built`);
    }
  },
});
