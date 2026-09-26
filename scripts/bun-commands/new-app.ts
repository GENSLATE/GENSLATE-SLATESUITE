/**
 * `bun run new-app <name> [--title …] [--identifier …] [--port …]` — scaffold a Tauri app
 * from `.config/moon/templates/tauri-app` into `desktop/<name>`.
 */
import { cp, readdir, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { discoverApps } from '../lib/apps';
import { defineCommand, fail } from '../lib/args';
import { log } from '../lib/log';
import { moonAvailable } from '../lib/moon';
import { fromRoot, ROOT } from '../lib/paths';
import { run, runOrThrow } from '../lib/run';
import { renderTemplate } from '../lib/template';

const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const FIRST_PORT = 1420;
const TEMPLATE_DIR = fromRoot('.config/moon/templates/tauri-app');

await defineCommand({
  name: 'new-app',
  summary: 'Scaffold a new Tauri desktop app in desktop/<name> from the moon template.',
  usage: '<name> [--title <title>] [--identifier <id>] [--port <port>]',
  options: {
    title: { type: 'string', description: 'Product name. Default: "GENSLATE <Name>".' },
    identifier: {
      type: 'string',
      description: 'Bundle id. Default: space.angeletti.genslate.<name>.',
    },
    port: {
      type: 'string',
      description: 'Vite port (HMR = port + 1). Default: next free pair after existing apps.',
    },
    'no-install': { type: 'boolean', description: 'Skip `bun install` afterwards.' },
  },
  details: `
Example
  bun run new-app notes           # desktop/notes, "GENSLATE Notes", port 1422/1423`,
  async run({ values, positionals }) {
    const name = positionals[0] ?? fail('missing <name>');
    if (!NAME.test(name)) fail(`"${name}" must be kebab-case (e.g. "notes", "code-review")`);
    const dir = fromRoot('desktop', name);
    await assertEmptyOrPlaceholder(dir);

    const apps = await discoverApps();
    const port =
      values.port === undefined ? nextPort(apps.map((app) => app.port)) : Number(values.port);
    if (!Number.isInteger(port) || port < 1024 || port > 65_534)
      fail(`invalid port "${values.port}"`);
    if (apps.some((app) => app.port === port || app.port === port - 1 || app.port === port + 1)) {
      fail(`port ${port} (or its HMR port) is used by another app`);
    }
    const vars = {
      name,
      title: values.title ?? `GENSLATE ${titleCase(name)}`,
      identifier: values.identifier ?? `space.angeletti.genslate.${name.replaceAll('-', '')}`,
      port,
    };
    log.title(`Creating ${vars.title} in ${relative(ROOT, dir)} (port ${port}, HMR ${port + 1})`);

    await rm(join(dir, '.gitkeep'), { force: true });
    const generated =
      (await moonAvailable()) &&
      (await run([
        'bunx',
        'moon',
        'generate',
        'tauri-app',
        '--to',
        relative(ROOT, dir),
        '--defaults',
        '--',
        '--name',
        vars.name,
        '--title',
        vars.title,
        '--identifier',
        vars.identifier,
        '--port',
        String(vars.port),
      ])) === 0;
    if (!generated) {
      log.step('rendering the template directly');
      const files = await renderTemplate(TEMPLATE_DIR, dir, vars);
      log.info(`${files.length} files written`);
    }

    // Icons are binary, so they are copied rather than templated.
    await cp(fromRoot('desktop/example/src-tauri/icons'), join(dir, 'src-tauri/icons'), {
      recursive: true,
    });
    log.info('icons copied from desktop/example (regenerate with `bunx tauri icon <1024px.png>`)');

    const logDir = fromRoot('other/logs/app-logs', name);
    if (!(await Bun.file(join(logDir, '.gitkeep')).exists()))
      await Bun.write(join(logDir, '.gitkeep'), '');

    if (!values['no-install']) await runOrThrow(['bun', 'install']);
    log.success(`${vars.title} is ready`);
    log.info(`next: bun run dev ${name}`);
  },
});

function nextPort(ports: readonly (number | undefined)[]): number {
  const used = ports.filter((port): port is number => port !== undefined);
  return used.length === 0 ? FIRST_PORT : Math.max(...used) + 2;
}

function titleCase(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function assertEmptyOrPlaceholder(dir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  if (entries.some((entry) => entry !== '.gitkeep'))
    fail(`${relative(ROOT, dir)} already exists and is not empty`);
}
