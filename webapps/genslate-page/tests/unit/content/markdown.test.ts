import { describe, expect, test } from 'bun:test';

import {
  decodeEntities,
  type LinkContext,
  parseFrontmatter,
  renderMarkdown,
  rewriteHref,
} from '../../../plugins/markdown';

const ctx: LinkContext = {
  source: 'other/documents/ipc.md',
  routes: new Map([
    ['other/documents/architecture.md', '/docs/developers/architecture/'],
    ['webapps/genslate-page/content/wiki/launcher.md', '/docs/launcher/'],
  ]),
  base: '/GENSLATE/',
  repoUrl: 'https://github.com/genslate/GENSLATE',
  branch: 'main',
};

// A stand-in for Shiki: keeps the language visible and the code escaped.
const highlight = (code: string, language: string) =>
  `<pre class="shiki" data-test-lang="${language}"><code>${code.replace(/</g, '&lt;')}</code></pre>`;

describe('parseFrontmatter', () => {
  test('reads key: value pairs and numeric order', () => {
    const { data, body } = parseFrontmatter(
      '---\ntitle: "Hello"\norder: 3\nicon: codicon:book\n---\n# Body\n',
    );
    expect(data).toEqual({ title: 'Hello', order: 3, icon: 'codicon:book' });
    expect(body).toBe('# Body\n');
  });

  test('passes documents without frontmatter through', () => {
    expect(parseFrontmatter('# Only a title').body).toBe('# Only a title');
  });
});

describe('rewriteHref', () => {
  test('maps a relative .md link to its site route, keeping the hash', () => {
    expect(rewriteHref('./architecture.md#layers', ctx)).toEqual({
      href: '/GENSLATE/docs/developers/architecture/#layers',
      external: false,
    });
  });

  test('sends other repository files to GitHub', () => {
    expect(rewriteHref('../../CLAUDE.md', ctx)).toEqual({
      href: 'https://github.com/genslate/GENSLATE/blob/main/CLAUDE.md',
      external: true,
    });
    expect(rewriteHref('../licenses/', ctx).href).toBe(
      'https://github.com/genslate/GENSLATE/tree/main/other/licenses',
    );
  });

  test('prefixes site-absolute links with the base', () => {
    expect(rewriteHref('/docs/faq/', ctx)).toEqual({
      href: '/GENSLATE/docs/faq/',
      external: false,
    });
  });

  test('leaves anchors alone and marks absolute URLs external', () => {
    expect(rewriteHref('#usage', ctx)).toEqual({ href: '#usage', external: false });
    expect(rewriteHref('https://v2.tauri.app', ctx).external).toBe(true);
  });
});

describe('renderMarkdown', () => {
  const source = [
    '# Inter-process calls',
    '',
    'Commands cross the **bridge**.',
    '',
    '## Calling Rust',
    '',
    '```ts',
    'invoke<"x">("ping")',
    '```',
    '',
    '### Errors & results',
    '',
    '> [!WARNING]',
    '> Never block.',
    '',
    '| A | B |',
    '|---|---|',
    '| 1 | 2 |',
    '',
    'See [architecture](./architecture.md) and [Tauri](https://v2.tauri.app).',
  ].join('\n');

  test('takes the H1 as the title and the first paragraph as the summary', async () => {
    const doc = await renderMarkdown(source, ctx, highlight);
    expect(doc.title).toBe('Inter-process calls');
    expect(doc.summary).toBe('Commands cross the bridge.');
    expect(doc.html).not.toContain('<h1');
  });

  test('collects an h2/h3 outline and adds anchors', async () => {
    const doc = await renderMarkdown(source, ctx, highlight);
    expect(doc.headings).toEqual([
      { id: 'calling-rust', text: 'Calling Rust', level: 2 },
      { id: 'errors-results', text: 'Errors & results', level: 3 },
    ]);
    expect(doc.html).toContain('class="heading-anchor" href="#calling-rust"');
  });

  test('frames and highlights fenced code with its raw text', async () => {
    const doc = await renderMarkdown(source, ctx, highlight);
    expect(doc.html).toContain('class="code-frame" data-lang="ts"');
    expect(doc.html).toContain('data-test-lang="ts"');
    expect(doc.html).toContain('invoke&lt;"x">("ping")');
    expect(doc.html).toContain('data-copy-code');
  });

  test('turns GitHub alerts into callouts and wraps tables', async () => {
    const doc = await renderMarkdown(source, ctx, highlight);
    expect(doc.html).toContain('data-callout="warning"');
    expect(doc.html).toContain('<div class="table-wrap" tabindex="0"><table>');
  });

  test('rewrites links and hardens external ones', async () => {
    const doc = await renderMarkdown(source, ctx, highlight);
    expect(doc.html).toContain('href="/GENSLATE/docs/developers/architecture/"');
    expect(doc.html).toContain(
      'href="https://v2.tauri.app" target="_blank" rel="noopener noreferrer"',
    );
  });

  test('prefers frontmatter title and description', async () => {
    const doc = await renderMarkdown(
      '---\ntitle: Wiki\ndescription: Short\n---\n# Other\n\nText.',
      ctx,
      highlight,
    );
    expect(doc.title).toBe('Wiki');
    expect(doc.summary).toBe('Short');
  });
});

test('decodeEntities reverses the escapes Bun emits', () => {
  expect(decodeEntities('&lt;a href=&quot;x&quot;&gt; &amp; &#39;')).toBe('<a href="x"> & \'');
});
