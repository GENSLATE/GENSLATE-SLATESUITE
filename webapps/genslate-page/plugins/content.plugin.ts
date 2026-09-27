/**
 * Vite plugin: turns Markdown and code snippets into virtual modules at build time.
 *
 * - `virtual:genslate-docs`         the docs index (titles, sections, outlines) + lazy loaders
 * - `virtual:genslate-doc/<slug>`   one page's HTML (its own chunk)
 * - `virtual:genslate-snippets`     highlighted tokens for the app mockups
 *
 * Sources: the user wiki (`content/wiki/*.md`, with frontmatter) and the developer docs
 * (`other/documents/*.md`, the repo's single source of truth). Saving any of them in dev reloads
 * the page.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

import { getHighlighter } from './highlight';
import { type DocHeading, type LinkContext, renderMarkdown } from './markdown';

export interface ContentPluginOptions {
  /** Absolute path of the monorepo root. */
  readonly repoRoot: string;
  /** Absolute path of this site's project folder. */
  readonly siteRoot: string;
  readonly repoUrl: string;
  readonly branch: string;
}

/** The public shape of one docs page (mirrored in `src/content/content.types.ts`). */
export interface DocEntry {
  readonly slug: string;
  readonly route: string;
  readonly title: string;
  readonly description: string;
  readonly section: string;
  readonly order: number;
  readonly icon: string;
  readonly source: string;
  readonly headings: readonly DocHeading[];
  readonly readingMinutes: number;
}

const DOCS_ID = 'virtual:genslate-docs';
const DOC_PREFIX = 'virtual:genslate-doc/';
const SNIPPETS_ID = 'virtual:genslate-snippets';

/** Developer docs, in the order of `other/documents/README.md`. */
const DEVELOPER_DOCS: readonly { file: string; icon: string }[] = [
  { file: 'getting-started', icon: 'codicon:rocket' },
  { file: 'commands', icon: 'codicon:terminal' },
  { file: 'architecture', icon: 'codicon:type-hierarchy' },
  { file: 'design-system', icon: 'codicon:symbol-color' },
  { file: 'context-menus', icon: 'codicon:list-flat' },
  { file: 'ipc', icon: 'codicon:plug' },
  { file: 'portability', icon: 'codicon:package' },
  { file: 'testing', icon: 'codicon:beaker' },
  { file: 'release', icon: 'codicon:tag' },
  { file: 'security', icon: 'codicon:shield' },
  { file: 'contributing', icon: 'codicon:git-pull-request' },
  { file: 'website', icon: 'codicon:globe' },
];

const toPosix = (path: string) => path.split(sep).join('/');

interface Source {
  readonly slug: string;
  readonly route: string;
  readonly file: string;
  readonly repoPath: string;
  readonly section?: string;
  readonly order?: number;
  readonly icon?: string;
}

function listSources(options: ContentPluginOptions): Source[] {
  const wikiDir = join(options.siteRoot, 'content', 'wiki');
  const wiki = readdirSync(wikiDir)
    .filter((name) => name.endsWith('.md'))
    .map((name): Source => {
      const slug = basename(name, '.md');
      const file = join(wikiDir, name);
      return {
        slug,
        route: `/docs/${slug}/`,
        file,
        repoPath: toPosix(relative(options.repoRoot, file)),
      };
    });
  const developers = DEVELOPER_DOCS.map(({ file: name, icon }, index): Source => {
    const file = join(options.repoRoot, 'other', 'documents', `${name}.md`);
    return {
      slug: `developers/${name}`,
      route: `/docs/developers/${name}/`,
      file,
      repoPath: `other/documents/${name}.md`,
      section: 'Developers',
      order: index,
      icon,
    };
  });
  return [...wiki, ...developers];
}

interface Collection {
  readonly entries: DocEntry[];
  readonly html: Map<string, string>;
}

async function collect(options: ContentPluginOptions, base: string): Promise<Collection> {
  const highlighter = await getHighlighter();
  const sources = listSources(options);
  const routes = new Map(sources.map((source) => [source.repoPath, source.route]));
  // The docs map links here: send it to the docs home.
  routes.set('other/documents/README.md', '/docs/');

  const entries: DocEntry[] = [];
  const html = new Map<string, string>();
  for (const source of sources) {
    const ctx: LinkContext = {
      source: source.repoPath,
      routes,
      base,
      repoUrl: options.repoUrl,
      branch: options.branch,
    };
    const doc = await renderMarkdown(readFileSync(source.file, 'utf8'), ctx, highlighter.html);
    entries.push({
      slug: source.slug,
      route: source.route,
      title: doc.title ?? source.slug,
      description: doc.summary ?? '',
      section: source.section ?? doc.frontmatter.section ?? 'Guides',
      order: source.order ?? doc.frontmatter.order ?? 99,
      icon: source.icon ?? doc.frontmatter.icon ?? 'codicon:book',
      source: source.repoPath,
      headings: doc.headings,
      readingMinutes: doc.readingMinutes,
    });
    html.set(source.slug, doc.html);
  }
  return { entries, html };
}

async function collectSnippets(siteRoot: string): Promise<Record<string, unknown>> {
  const highlighter = await getHighlighter();
  const dir = join(siteRoot, 'content', 'snippets');
  const snippets: Record<string, unknown> = {};
  for (const name of readdirSync(dir)) {
    // `<name>.<lang>.snippet`
    const match = /^(.+)\.([a-z]+)\.snippet$/.exec(name);
    if (!match?.[1] || !match[2]) continue;
    const code = readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n').trimEnd();
    snippets[match[1]] = highlighter.tokens(code, match[2]);
  }
  return snippets;
}

/** The content plugin. */
export function genslateContent(options: ContentPluginOptions): Plugin {
  let base = '/';
  let cache: Promise<Collection> | undefined;
  const load = () => {
    cache ??= collect(options, base);
    return cache;
  };

  const invalidate = (server: ViteDevServer) => {
    cache = undefined;
    for (const module of server.moduleGraph.idToModuleMap.values()) {
      if (module.id?.startsWith('\0virtual:genslate-')) server.moduleGraph.invalidateModule(module);
    }
    server.ws.send({ type: 'full-reload' });
  };

  return {
    name: 'genslate-content',
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      const watched = [
        join(options.siteRoot, 'content'),
        join(options.repoRoot, 'other', 'documents'),
      ];
      server.watcher.add(watched);
      server.watcher.on('change', (file) => {
        if (watched.some((dir) => file.startsWith(dir))) invalidate(server);
      });
    },
    resolveId(id) {
      if (id === DOCS_ID || id === SNIPPETS_ID || id.startsWith(DOC_PREFIX)) return `\0${id}`;
      return undefined;
    },
    async load(id) {
      if (!id.startsWith('\0virtual:genslate-')) return undefined;
      const key = id.slice(1);
      if (key === SNIPPETS_ID) {
        return `export const snippets = ${JSON.stringify(await collectSnippets(options.siteRoot))};`;
      }
      const { entries, html } = await load();
      if (key === DOCS_ID) {
        const loaders = entries
          .map(
            (entry) =>
              `  ${JSON.stringify(entry.slug)}: () => import(${JSON.stringify(DOC_PREFIX + entry.slug)}).then((m) => m.html),`,
          )
          .join('\n');
        return [
          `export const docs = ${JSON.stringify(entries)};`,
          `const loaders = {\n${loaders}\n};`,
          'export function loadDocHtml(slug) {',
          '  const load = loaders[slug];',
          '  return load ? load() : Promise.resolve(undefined);',
          '}',
        ].join('\n');
      }
      const slug = key.slice(DOC_PREFIX.length);
      const page = html.get(slug);
      if (page === undefined) this.error(`Unknown docs page: ${slug}`);
      return `export const html = ${JSON.stringify(page)};`;
    },
  };
}
