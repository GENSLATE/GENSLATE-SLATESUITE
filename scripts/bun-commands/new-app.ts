/**
 * `bun run new-app <name> [--title …] [--identifier …] [--port …] [--allow-existing]` — scaffold a
 * Tauri app from `.config/moon/templates/tauri-app` into `desktop/<name>`, plus its config stubs
 * (`other/config/genslate/<name>/`), launcher metadata and log folder.
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
  usage: '<name> [--title <title>] [--identifier <id>] [--port <port>] [--allow-existing]',
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
    'allow-existing': {
      type: 'boolean',
      description:
        'Scaffold into a non-empty desktop/<name> (fails if a template file already exists).',
    },
  },
  details: `
Example
  bun run new-app notes           # desktop/notes, "GENSLATE Notes", port 1422/1423`,
  async run({ values, positionals }) {
    const name = positionals[0] ?? fail('missing <name>');
    if (!NAME.test(name)) fail(`"${name}" must be kebab-case (e.g. "notes", "code-review")`);
    const dir = fromRoot('desktop', name);
    if (values['allow-existing']) await assertNoCollisions(TEMPLATE_DIR, dir);
    else await assertEmptyOrPlaceholder(dir);

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

    await writeIfMissing(fromRoot('other/logs/app-logs', name, '.gitkeep'), '');
    await writeIfMissing(
      fromRoot('other/config/genslate', name, 'config.toml'),
      configStub(vars.title),
    );
    await writeIfMissing(
      fromRoot('other/config/genslate', name, 'keybindings.toml'),
      `# ${vars.title} — keyboard shortcuts. Every key is optional.
`,
    );
    await writeIfMissing(
      fromRoot('other/config/appdata/metadata', `${name}.toml`),
      metadataStub(name, vars.title),
    );
    log.info(
      `config stubs in other/config/genslate/${name}/, metadata in other/config/appdata/metadata/${name}.toml`,
    );

    if (!values['no-install']) await runOrThrow(['bun', 'install']);
    log.success(`${vars.title} is ready`);
    log.info(`next: bun run dev ${name}`);
  },
});

/** Writes `contents` unless the file already exists (never clobbers user edits). */
async function writeIfMissing(path: string, contents: string): Promise<void> {
  if (!(await Bun.file(path).exists())) await Bun.write(path, contents);
}

function configStub(title: string): string {
  return `# ${title} — settings. Every key is optional; delete a key to get its default.
# See other/documents/portability.md for where this file lives.
`;
}

/** Launcher metadata. `version`/`build`/`identifier`/`exe` are stamped by `bun run package`. */
function metadataStub(name: string, title: string): string {
  return `# How the GENSLATE launcher shows ${title}.
[app]
name = "${titleCase(name)}"
description = ""
# Development · Media · Office · Internet · Graphics · Utilities · System
category = "Utilities"
# Nord colour of the icon tile: nord7 … nord15
color = "nord9"
keywords = []

[build]
guid = "${crypto.randomUUID()}"
`;
}

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

/** With --allow-existing: refuse only if a template file would overwrite something. */
async function assertNoCollisions(templateDir: string, dir: string): Promise<void> {
  const glob = new Bun.Glob('**/*');
  for await (const file of glob.scan({ cwd: templateDir, dot: true })) {
    if (file === 'template.yml') continue;
    if (await Bun.file(join(dir, file)).exists())
      fail(`${relative(ROOT, join(dir, file))} already exists`);
  }
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
