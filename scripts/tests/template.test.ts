// cspell:words tera
import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fromRoot } from '../lib/paths';
import { renderPath, renderString, renderTemplate } from '../lib/template';

const vars = {
  name: 'code-review',
  title: 'GENSLATE Code Review',
  identifier: 'space.angeletti.genslate.review',
  port: 1424,
  description: 'Review code with your team',
  category: 'DeveloperTool',
};

describe('template renderer (moon/Tera subset)', () => {
  test('variables, arithmetic and filters', () => {
    expect(renderString('{{ title }} on {{port}} / {{ port + 1 }}', vars)).toBe(
      'GENSLATE Code Review on 1424 / 1425',
    );
    expect(renderString('genslate_{{ name | replace(from="-", to="_") }}_lib', vars)).toBe(
      'genslate_code_review_lib',
    );
    expect(renderString('{{ name | upper }}', vars)).toBe('CODE-REVIEW');
  });

  test('bracket variables in paths', () => {
    expect(renderPath('desktop/[name]/index.html', vars)).toBe('desktop/code-review/index.html');
  });

  test('unknown variables and filters fail loudly', () => {
    expect(() => renderString('{{ missing }}', vars)).toThrow('unknown variable');
    expect(() => renderString('{{ name | slugify }}', vars)).toThrow('unsupported filter');
  });

  test('the tauri-app template renders without leftovers', async () => {
    const out = await mkdtemp(join(tmpdir(), 'genslate-template-'));
    try {
      const files = await renderTemplate(fromRoot('.config/moon/templates/tauri-app'), out, vars);
      expect(files.some((file) => file.endsWith('template.yml'))).toBe(false);
      for (const file of files) {
        expect(await readFile(file, 'utf8')).not.toMatch(/\{\{|\}\}/);
      }
      const conf = JSON.parse(await readFile(join(out, 'src-tauri/tauri.conf.json'), 'utf8')) as {
        identifier: string;
        build: { devUrl: string };
        bundle: { category: string; shortDescription: string };
      };
      expect(conf.identifier).toBe(vars.identifier);
      expect(conf.build.devUrl).toBe('http://localhost:1424');
      expect(conf.bundle.category).toBe('DeveloperTool');
      expect(conf.bundle.shortDescription).toBe('Review code with your team.');
      const meta = await readFile(join(out, 'src/app/app.meta.ts'), 'utf8');
      expect(meta).toContain("name: 'Code Review',");
      expect(meta).toContain("productName: 'GENSLATE Code Review',");
      expect(meta).toContain("'../../../../other/resources/icons/genslate/code-review.svg'");
      const lib = await readFile(join(out, 'src-tauri/src/lib.rs'), 'utf8');
      expect(lib).toContain('use genslate_core_code_review::{Config, LogLevel};');
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  });

  test('the app-core template renders a crate named after the app', async () => {
    const out = await mkdtemp(join(tmpdir(), 'genslate-template-'));
    try {
      const files = await renderTemplate(fromRoot('.config/moon/templates/app-core'), out, vars);
      for (const file of files) {
        expect(await readFile(file, 'utf8')).not.toMatch(/\{\{|\}\}/);
      }
      const manifest = Bun.TOML.parse(await readFile(join(out, 'Cargo.toml'), 'utf8')) as {
        package: { name: string };
        dependencies: Record<string, unknown>;
      };
      expect(manifest.package.name).toBe('genslate-core-code-review');
      expect(manifest.dependencies).toHaveProperty('genslate-app-common');
      expect(await readFile(join(out, 'src/config.rs'), 'utf8')).toContain(
        'other/config/genslate/code-review/config.toml',
      );
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  });
});
