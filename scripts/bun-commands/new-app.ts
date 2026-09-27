/**
 * `bun run new-app <name> [--title …] [--identifier …] [--port …] [--allow-existing]` — scaffold a
 * Tauri app from `.config/moon/templates/tauri-app` into `desktop/<name>` and its core crate from
 * `.config/moon/templates/app-core` into `crates/core/<name>`, plus its config stubs
 * (`other/config/genslate/<name>/`), launcher metadata, icon, bundle icons and log folder.
 */
import { cp, readdir, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { discoverApps } from '../lib/apps';
import { defineCommand, fail } from '../lib/args';
import { log } from '../lib/log';
import { moonAvailable } from '../lib/moon';
import { fromRoot, ROOT } from '../lib/paths';
import { run, runOrThrow } from '../lib/run';
import {
  addWorkspaceDependency,
  configStub,
  parseMetadata,
  placeholderIcon,
  tauriCategory,
} from '../lib/scaffold';
import { renderTemplate, type TemplateVars } from '../lib/template';

const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const FIRST_PORT = 1420;
const TEMPLATE_DIR = fromRoot('.config/moon/templates/tauri-app');
const CORE_TEMPLATE_DIR = fromRoot('.config/moon/templates/app-core');

await defineCommand({
  name: 'new-app',
  summary: 'Scaffold a new Tauri desktop app in desktop/<name> from the moon template.',
  usage: '<name> [--title <title>] [--identifier <id>] [--port <port>] [--allow-existing]',
  options: {
    title: {
      type: 'string',
      description: 'Product name. Default: "GENSLATE <metadata name>", else "GENSLATE <Name>".',
    },
    description: {
      type: 'string',
      description: 'One line, no trailing period. Default: the launcher metadata description.',
    },
    category: {
      type: 'string',
      description: 'tauri.conf.json bundle.category. Default: from the metadata category.',
    },
    identifier: {
      type: 'string',
      description: 'Bundle id. Default: space.angeletti.genslate.<name>.',
    },
    port: {
      type: 'string',
      description: 'Vite port (HMR = port + 1). Default: next free pair after existing apps.',
    },
    'no-install': {
      type: 'boolean',
      description: 'Skip `bun install` (and so the bundle icons, which need the Tauri CLI).',
    },
    'allow-existing': {
      type: 'boolean',
      description:
        'Scaffold into a non-empty desktop/<name> (fails if a template file already exists).',
    },
  },
  details: `
Example
  bun run new-app notes           # desktop/notes + crates/core/notes, "GENSLATE Notes", next free port`,
  async run({ values, positionals }) {
    const name = positionals[0] ?? fail('missing <name>');
    if (!NAME.test(name)) fail(`"${name}" must be kebab-case (e.g. "notes", "code-review")`);
    const dir = fromRoot('desktop', name);
    const coreDir = fromRoot('crates/core', name);
    if (values['allow-existing']) await assertNoCollisions(TEMPLATE_DIR, dir);
    else await assertEmptyOrPlaceholder(dir);
    await assertEmptyOrPlaceholder(coreDir);

    const apps = await discoverApps();
    const port =
      values.port === undefined ? nextPort(apps.map((app) => app.port)) : Number(values.port);
    if (!Number.isInteger(port) || port < 1024 || port > 65_534)
      fail(`invalid port "${values.port}"`);
    if (apps.some((app) => app.port === port || app.port === port - 1 || app.port === port + 1)) {
      fail(`port ${port} (or its HMR port) is used by another app`);
    }
    const metadataFile = fromRoot('other/config/appdata/metadata', `${name}.toml`);
    const metadata = parseMetadata(
      (await Bun.file(metadataFile).exists()) ? await Bun.file(metadataFile).text() : undefined,
    );
    const title = values.title ?? `GENSLATE ${metadata.name ?? titleCase(name)}`;
    const vars = {
      name,
      title,
      identifier: values.identifier ?? `space.angeletti.genslate.${name.replaceAll('-', '')}`,
      port,
      description: (values.description ?? metadata.description ?? `${title} desktop app`).replace(
        /\.$/,
        '',
      ),
      category: values.category ?? tauriCategory(metadata.category),
    };
    log.title(`Creating ${vars.title} in ${relative(ROOT, dir)} (port ${port}, HMR ${port + 1})`);

    await rm(join(dir, '.gitkeep'), { force: true });
    await generate('tauri-app', TEMPLATE_DIR, dir, vars);
    await generate('app-core', CORE_TEMPLATE_DIR, coreDir, { name, title });

    const cargoToml = fromRoot('Cargo.toml');
    await Bun.write(
      cargoToml,
      addWorkspaceDependency(
        await Bun.file(cargoToml).text(),
        `genslate-core-${name}`,
        `crates/core/${name}`,
      ),
    );
    log.info(`crates/core/${name} (genslate-core-${name}) added to the Cargo workspace`);

    await writeIfMissing(fromRoot('other/logs/app-logs', name, '.gitkeep'), '');
    await writeIfMissing(
      fromRoot('other/config/genslate', name, 'config.toml'),
      configStub(name, vars.title),
    );
    await writeIfMissing(
      fromRoot('other/config/genslate', name, 'keybindings.toml'),
      `# ${vars.title} — keyboard shortcuts. Every key is optional.
`,
    );
    await writeIfMissing(metadataFile, metadataStub(name, vars.title));
    log.info(
      `config stubs in other/config/genslate/${name}/, metadata in other/config/appdata/metadata/${name}.toml`,
    );
    const icon = fromRoot('other/resources/icons/genslate', `${name}.svg`);
    if (await writeIfMissing(icon, placeholderIcon(vars.title))) {
      log.warn(`placeholder icon written to ${relative(ROOT, icon)}: design the real glyph there`);
    }

    if (!values['no-install']) await runOrThrow(['bun', 'install']);
    await bundleIcons(dir, icon, values['no-install'] === true);
    log.success(`${vars.title} is ready`);
    log.info(`next: bun run dev ${name}`);
  },
});

/** Renders a template with `moon generate`, or directly when moon cannot load the workspace. */
async function generate(
  id: string,
  templateDir: string,
  destination: string,
  vars: TemplateVars,
): Promise<void> {
  const args = Object.entries(vars).flatMap(([key, value]) => [`--${key}`, String(value)]);
  const generated =
    (await moonAvailable()) &&
    (await run([
      'bunx',
      'moon',
      'generate',
      id,
      '--to',
      relative(ROOT, destination),
      '--defaults',
      '--',
      ...args,
    ])) === 0;
  if (!generated) {
    log.step(`rendering the ${id} template directly`);
    const files = await renderTemplate(templateDir, destination, vars);
    log.info(`${files.length} files written to ${relative(ROOT, destination)}`);
  }
}

/**
 * Generates `src-tauri/icons` from the app's SVG with the Tauri CLI (desktop sizes only), or
 * copies desktop/example's icons when the CLI is not available.
 */
async function bundleIcons(dir: string, svg: string, skip: boolean): Promise<void> {
  const out = join(dir, 'src-tauri/icons');
  const generated =
    // `bun run tauri` only uses the app's own CLI (`bun x` would fetch an unrelated package).
    !skip && (await run(['bun', 'run', 'tauri', 'icon', svg, '-o', out], { cwd: dir })) === 0;
  if (generated) {
    // The CLI also writes mobile icons; GENSLATE apps are desktop-only.
    await rm(join(out, 'android'), { recursive: true, force: true });
    await rm(join(out, 'ios'), { recursive: true, force: true });
    log.info(`bundle icons generated from ${relative(ROOT, svg)}`);
    return;
  }
  await cp(fromRoot('desktop/example/src-tauri/icons'), out, { recursive: true });
  log.warn(
    `icons copied from desktop/example; regenerate with \`bun run tauri icon ${relative(dir, svg)}\` in ${relative(ROOT, dir)}`,
  );
}

/** Writes `contents` unless the file already exists (never clobbers user edits). */
async function writeIfMissing(path: string, contents: string): Promise<boolean> {
  if (await Bun.file(path).exists()) return false;
  await Bun.write(path, contents);
  return true;
}

/** Launcher metadata. `version`/`build`/`identifier`/`exe` are stamped by `bun run package`. */
function metadataStub(name: string, title: string): string {
  return `# How the GENSLATE launcher shows ${title}.
[app]
name = "${titleCase(name)}"
description = ""
# Development · Office · Internet · Media · Utilities · System · AI
category = "Utilities"
# Signature Nord colour (the accent of its icon): nord7 … nord15
color = "nord8"
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
