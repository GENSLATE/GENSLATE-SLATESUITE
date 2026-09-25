// cspell:words javascriptcoregtk libsoup modversion
/**
 * `bun run setup` — first-time setup: dependencies, moon, git hooks, toolchain checks.
 */
import { defineCommand } from '../lib/args';
import { log } from '../lib/log';
import { moonAvailable } from '../lib/moon';
import { fromRoot } from '../lib/paths';
import { capture, run, runOrThrow } from '../lib/run';

/** pkg-config modules Tauri 2 needs on Linux (https://v2.tauri.app/start/prerequisites/). */
const LINUX_PKG_CONFIG = [
  'webkit2gtk-4.1',
  'javascriptcoregtk-4.1',
  'libsoup-3.0',
  'gtk+-3.0',
  'librsvg-2.0',
];

await defineCommand({
  name: 'setup',
  summary: 'Install dependencies, sync moon, install git hooks and check the Rust/Tauri toolchain.',
  usage: '[--skip-install]',
  options: {
    'skip-install': { type: 'boolean', description: 'Skip `bun install`.' },
  },
  async run({ values }) {
    const problems: string[] = [];

    if (!values['skip-install']) {
      log.title('Dependencies');
      await runOrThrow(['bun', 'install']);
    }

    log.title('moon');
    if (await moonAvailable()) {
      if ((await run(['bunx', 'moon', 'sync'])) !== 0) problems.push('moon sync failed');
      if ((await run(['bunx', 'moon', 'sync', 'config-schemas'])) !== 0)
        problems.push('moon config schemas failed');
    } else {
      problems.push(
        'moon could not load its toolchain plugins (network?); scripts will run tools directly',
      );
    }

    log.title('Git hooks');
    if ((await run(['bunx', 'lefthook', 'install'])) !== 0)
      problems.push('lefthook install failed');

    log.title('Rust');
    const expected = await expectedRust();
    const rustc = await capture(['rustc', '--version']);
    if (rustc.code !== 0) {
      problems.push(
        'rustc not found: install rustup (https://rustup.rs); rust-toolchain.toml pins the version',
      );
    } else {
      log.info(rustc.stdout.trim());
      if (expected !== undefined && !rustc.stdout.includes(expected)) {
        problems.push(
          `rustc is not ${expected} (from .prototools); run \`rustup show\` in the repo`,
        );
      }
    }

    if (process.platform === 'linux') {
      log.title('Tauri system libraries');
      for (const module of LINUX_PKG_CONFIG) {
        const found = await capture(['pkg-config', '--modversion', module]);
        if (found.code === 0) log.success(`${module} ${found.stdout.trim()}`);
        else
          problems.push(`missing ${module} (see https://v2.tauri.app/start/prerequisites/#linux)`);
      }
    }

    log.title('Summary');
    if (problems.length === 0) {
      log.success('ready: try `bun run dev`');
      return;
    }
    for (const problem of problems) log.warn(problem);
  },
});

async function expectedRust(): Promise<string | undefined> {
  const prototools = await Bun.file(fromRoot('.prototools')).text();
  return /^rust\s*=\s*"([^"]+)"/m.exec(prototools)?.[1];
}
