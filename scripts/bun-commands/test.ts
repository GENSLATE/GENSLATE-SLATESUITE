/**
 * `bun run test [--ts] [--rust]` — every unit test (bun + cargo).
 */
import { relative } from 'node:path';

import { defineCommand } from '../lib/args';
import { log } from '../lib/log';
import { moonAvailable, moonRun } from '../lib/moon';
import { ROOT } from '../lib/paths';
import { discoverProjects } from '../lib/projects';
import { run } from '../lib/run';

await defineCommand({
  name: 'test',
  summary: 'Run the TypeScript (bun test) and Rust (cargo test) suites.',
  usage: '[--ts] [--rust] [--direct]',
  options: {
    ts: { type: 'boolean', description: 'Only TypeScript tests.' },
    rust: { type: 'boolean', description: 'Only Rust tests.' },
    direct: { type: 'boolean', description: 'Skip moon and run bun/cargo directly.' },
  },
  async run({ values }) {
    const both = values.ts === values.rust;
    const failures: string[] = [];

    if (!values.direct && (await moonAvailable())) {
      const targets = [
        ...(both || values.ts ? [':test'] : []),
        ...(both || values.rust ? ['root:rust-test'] : []),
      ];
      const moonCode = await moonRun(targets);
      const scriptsCode = both || values.ts ? await run(['bun', 'test', 'scripts/tests']) : 0;
      process.exitCode = moonCode === 0 ? scriptsCode : moonCode;
      return;
    }

    if (both || values.ts) {
      log.title('TypeScript tests');
      if ((await run(['bun', 'test', 'scripts/tests'])) !== 0) failures.push('scripts/tests');
      for (const project of await discoverProjects()) {
        if (!project.hasTests) continue;
        const args = [
          'bun',
          'test',
          ...(project.preload === undefined ? [] : ['--preload', project.preload]),
        ];
        if ((await run(args, { cwd: project.dir })) !== 0)
          failures.push(relative(ROOT, project.dir));
      }
    }
    if (both || values.rust) {
      log.title('Rust tests');
      if ((await run(['cargo', 'test', '--workspace'])) !== 0) failures.push('cargo test');
    }

    if (failures.length > 0) {
      log.error(`failed: ${failures.join(', ')}`);
      process.exitCode = 1;
    } else {
      log.success('all tests passed');
    }
  },
});
