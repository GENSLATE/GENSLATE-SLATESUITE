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
      };
      expect(conf.identifier).toBe(vars.identifier);
      expect(conf.build.devUrl).toBe('http://localhost:1424');
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  });
});
