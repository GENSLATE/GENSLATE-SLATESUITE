import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CODICON_NAMES } from '@genslate/design-system';

import { parseFrontmatter } from '../../../plugins/markdown';
import { APPS, METADATA_NAME_OVERRIDES } from '../../../src/content/apps.content';

const repoRoot = join(import.meta.dir, '..', '..', '..', '..', '..', '..');
const siteRoot = join(import.meta.dir, '..', '..', '..');
const codicons = new Set<string>(CODICON_NAMES);

interface Metadata {
  app?: {
    name?: string;
    description?: string;
    category?: string;
    color?: string;
    keywords?: string[];
  };
}

const readMetadata = (id: string): Metadata =>
  Bun.TOML.parse(
    readFileSync(join(repoRoot, 'other', 'config', 'appdata', 'metadata', `${id}.toml`), 'utf8'),
  ) as Metadata;

describe('the website app catalogue', () => {
  test('matches the launcher metadata for every app', () => {
    for (const app of APPS) {
      const meta = readMetadata(app.id).app;
      expect(meta).toBeDefined();
      expect(METADATA_NAME_OVERRIDES[app.id] ?? app.name).toBe(meta?.name ?? '');
      expect(app.tagline).toBe(meta?.description ?? '');
      expect(app.category).toBe(meta?.category as typeof app.category);
      expect(app.color).toBe(meta?.color as typeof app.color);
      expect([...app.keywords]).toEqual(meta?.keywords ?? []);
    }
  });

  test('lists every app folder under desktop/ once', () => {
    const folders = readdirSync(join(repoRoot, 'desktop'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(APPS.map((app) => app.id).sort()).toEqual(folders);
  });

  test('has an icon in the GENSLATE icon family for every app', () => {
    const icons = readdirSync(join(repoRoot, 'other', 'resources', 'icons', 'genslate'));
    for (const app of APPS) expect(icons).toContain(`${app.id}.svg`);
  });

  test('links guides that exist', () => {
    const wiki = readdirSync(join(siteRoot, 'content', 'wiki'));
    for (const app of APPS) if (app.guide) expect(wiki).toContain(`${app.guide}.md`);
  });
});

describe('the wiki', () => {
  const pages = readdirSync(join(siteRoot, 'content', 'wiki')).filter((name) =>
    name.endsWith('.md'),
  );

  test('every page has a title, description, section and a known Codicon', () => {
    for (const page of pages) {
      const { data } = parseFrontmatter(
        readFileSync(join(siteRoot, 'content', 'wiki', page), 'utf8'),
      );
      expect(data.title, page).toBeTruthy();
      expect(data.description, page).toBeTruthy();
      expect(data.section, page).toBeTruthy();
      expect(codicons.has((data.icon ?? '').replace('codicon:', '')), `${page}: ${data.icon}`).toBe(
        true,
      );
    }
  });
});
