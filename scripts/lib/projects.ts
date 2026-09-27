import { basename, dirname, join } from 'node:path';

import { ROOT } from './paths';

/** A bun workspace package under desktop/, packages/ or webapps/ (one or two levels deep). */
export interface WorkspaceProject {
  readonly name: string;
  readonly dir: string;
  readonly hasTsconfig: boolean;
  readonly hasTests: boolean;
  /** `tests/setup/dom.preload.ts`, when the project tests need a DOM. */
  readonly preload: string | undefined;
}

/** Workspace packages with a package.json, sorted by path. */
export async function discoverProjects(): Promise<WorkspaceProject[]> {
  const projects: WorkspaceProject[] = [];
  for (const pattern of [
    'desktop/*/package.json',
    'packages/*/package.json',
    'webapps/*/package.json',
    'webapps/*/*/package.json',
  ]) {
    for await (const relative of new Bun.Glob(pattern).scan({ cwd: ROOT })) {
      const dir = dirname(join(ROOT, relative));
      const preloadPath = join(dir, 'tests', 'setup', 'dom.preload.ts');
      const testFiles = new Bun.Glob('{src,tests}/**/*.test.{ts,tsx}').scan({ cwd: dir });
      const first = await testFiles.next();
      projects.push({
        // The project folder: `desktop/example/package.json` → `example`.
        name: basename(dir),
        dir,
        hasTsconfig: await Bun.file(join(dir, 'tsconfig.json')).exists(),
        hasTests: first.done !== true,
        preload: (await Bun.file(preloadPath).exists())
          ? './tests/setup/dom.preload.ts'
          : undefined,
      });
    }
  }
  return projects.sort((a, b) => a.dir.localeCompare(b.dir));
}
