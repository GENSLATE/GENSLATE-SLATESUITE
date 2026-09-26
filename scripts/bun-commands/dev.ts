/**
 * `bun run dev [app] [--web]` — run a desktop app with hot reload.
 */

import { findApp } from '../lib/apps';
import { defineCommand } from '../lib/args';
import { log } from '../lib/log';
import { moonAvailable, moonRun } from '../lib/moon';
import { run } from '../lib/run';

await defineCommand({
  name: 'dev',
  summary:
    'Run a Tauri app in dev mode (native window + Vite HMR), or just its web UI in a browser.',
  usage: '[app] [--web]',
  options: {
    web: {
      type: 'boolean',
      short: 'w',
      description: 'Vite only, in a normal browser (tauri-bridge calls become no-ops).',
    },
    direct: { type: 'boolean', description: 'Skip moon and run bun directly in the app folder.' },
  },
  details: `
Examples
  bun run dev                  # desktop/example in a native window
  bun run dev example --web    # http://localhost:1420 in your browser`,
  async run({ values, positionals }) {
    const app = await findApp(positionals[0] ?? 'example');
    log.title(
      `${app.productName} · ${values.web ? `web (http://localhost:${app.port ?? '?'})` : 'desktop'}`,
    );
    const task = values.web ? 'web-dev' : 'dev';
    const code =
      !values.direct && (await moonAvailable())
        ? await moonRun([`${app.name}:${task}`])
        : await run(values.web ? ['bun', 'run', 'vite:dev'] : ['bun', 'run', 'tauri', 'dev'], {
            cwd: app.dir,
          });
    process.exitCode = code;
  },
});
