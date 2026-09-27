/**
 * Markdown → HTML for the wiki and the developer docs, at build time only.
 *
 * Bun's built-in CommonMark/GFM parser does the parsing; this module adds what a docs site
 * needs on top: frontmatter, Shiki highlighting in a framed code block, GitHub alerts as
 * callouts, scrollable tables, heading anchors, an outline (h2/h3) and link rewriting
 * (`.md` links to site routes, other repo files to GitHub, external links hardened).
 */
import { posix } from 'node:path';

/** One outline entry. */
export interface DocHeading {
  readonly id: string;
  readonly text: string;
  readonly level: 2 | 3;
}

/** Frontmatter keys the wiki uses (all optional; dev docs have none). */
export interface Frontmatter {
  readonly title?: string;
  readonly description?: string;
  readonly section?: string;
  readonly order?: number;
  readonly icon?: string;
}

export interface RenderedMarkdown {
  readonly frontmatter: Frontmatter;
  /** The first `# H1`, removed from `html` (pages render their own title). */
  readonly title: string | undefined;
  /** The first paragraph, as plain text. */
  readonly summary: string | undefined;
  readonly html: string;
  readonly headings: readonly DocHeading[];
  readonly readingMinutes: number;
}

export interface LinkContext {
  /** Repo-relative path of the file being rendered, e.g. `other/documents/ipc.md`. */
  readonly source: string;
  /** Repo-relative Markdown path → site route (`/docs/developers/ipc/`). */
  readonly routes: ReadonlyMap<string, string>;
  /** Vite `base`, e.g. `/GENSLATE/`. */
  readonly base: string;
  /** `https://github.com/<owner>/<repo>`. */
  readonly repoUrl: string;
  readonly branch: string;
}

/** Synchronous highlighter: code + language → a `<pre>` element. */
export type Highlight = (code: string, language: string) => string;

const ALERTS: Readonly<Record<string, string>> = {
  NOTE: 'Note',
  TIP: 'Tip',
  IMPORTANT: 'Important',
  WARNING: 'Warning',
  CAUTION: 'Caution',
};

const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
};

/** Reverses the handful of entities Bun's HTML output uses. */
export function decodeEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39|#x27);/g, (entity) => ENTITIES[entity] ?? entity);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Splits a leading `---` block of `key: value` lines (a deliberately tiny YAML subset). */
export function parseFrontmatter(source: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { data: {}, body: source };
  const data: Record<string, string | number> = {};
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    const pair = /^([a-z][\w-]*):\s*(.*)$/i.exec(line.trim());
    if (!pair?.[1]) continue;
    const raw = (pair[2] ?? '').trim().replace(/^(['"])(.*)\1$/, '$2');
    data[pair[1]] = pair[1] === 'order' ? Number(raw) : raw;
  }
  return { data: data as Frontmatter, body: source.slice(match[0].length) };
}

/**
 * Rewrites one `href`. Returns the new href and whether it leaves the site.
 * - `#x`, `mailto:` → unchanged
 * - `https://…` → unchanged, external
 * - `/docs/…` (site-absolute) → prefixed with `base`
 * - relative `.md` known to the site → its route; any other repo path → GitHub
 */
export function rewriteHref(href: string, ctx: LinkContext): { href: string; external: boolean } {
  if (href.startsWith('#') || href.startsWith('mailto:')) return { href, external: false };
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return { href, external: true };
  if (href.startsWith('/')) return { href: ctx.base + href.slice(1), external: false };

  const [pathPart = '', hash] = href.split('#', 2);
  const target = posix.normalize(posix.join(posix.dirname(ctx.source), pathPart));
  const route = ctx.routes.get(target);
  if (route !== undefined) {
    return { href: ctx.base + route.slice(1) + (hash ? `#${hash}` : ''), external: false };
  }
  const kind = pathPart.endsWith('/') || !posix.extname(target) ? 'tree' : 'blob';
  const suffix = hash ? `#${hash}` : '';
  return {
    href: `${ctx.repoUrl}/${kind}/${ctx.branch}/${target.replace(/\/$/, '')}${suffix}`,
    external: true,
  };
}

function frameCode(code: string, language: string, highlight: Highlight): string {
  const label = language === 'text' ? 'plain text' : language;
  return [
    `<figure class="code-frame" data-lang="${escapeHtml(language)}">`,
    '<figcaption class="code-frame-bar">',
    `<span class="code-frame-lang">${escapeHtml(label)}</span>`,
    '<button type="button" class="code-frame-copy" data-copy-code aria-label="Copy code">',
    '<span class="codicon codicon-copy" aria-hidden="true"></span><span class="code-frame-copy-text">Copy</span>',
    '</button>',
    '</figcaption>',
    highlight(code.replace(/\n$/, ''), language),
    '</figure>',
  ].join('');
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Renders one Markdown document. */
export async function renderMarkdown(
  source: string,
  ctx: LinkContext,
  highlight: Highlight,
): Promise<RenderedMarkdown> {
  const { data: frontmatter, body } = parseFrontmatter(source);
  let html = Bun.markdown.html(body, { headings: { ids: true } });

  // The first H1 becomes the page title.
  let title: string | undefined;
  html = html.replace(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>\n?/, (_, inner: string) => {
    title = stripTags(inner);
    return '';
  });

  const firstParagraph = /<p>([\s\S]*?)<\/p>/.exec(html);
  const summary = firstParagraph?.[1] ? stripTags(firstParagraph[1]) : undefined;

  // Fenced code → highlighted, framed.
  html = html.replace(
    /<pre><code(?: class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_, language: string | undefined, code: string) =>
      frameCode(decodeEntities(code), language ?? 'text', highlight),
  );

  // GitHub alerts: > [!NOTE] …
  html = html.replace(
    /<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/g,
    (_, kind: string) =>
      `<blockquote class="callout" data-callout="${kind.toLowerCase()}"><p class="callout-title">${ALERTS[kind] ?? kind}</p><p>`,
  );

  // Wide tables scroll inside the column instead of the page.
  html = html
    .replace(/<table>/g, '<div class="table-wrap" tabindex="0"><table>')
    .replace(/<\/table>/g, '</table></div>');

  const headings: DocHeading[] = [];
  let current: { id: string; text: string; level: 2 | 3 } | null = null;

  const rewriter = new HTMLRewriter()
    .on('h2[id], h3[id]', {
      element(element) {
        const id = element.getAttribute('id') ?? '';
        const heading = { id, text: '', level: element.tagName === 'h2' ? 2 : 3 } as const;
        current = { ...heading };
        element.setAttribute('tabindex', '-1');
        element.append(
          `<a class="heading-anchor" href="#${escapeHtml(id)}" aria-label="Link to this section">#</a>`,
          { html: true },
        );
        element.onEndTag(() => {
          if (current) headings.push({ ...current, text: decodeEntities(current.text).trim() });
          current = null;
        });
      },
      text(chunk) {
        if (current) current.text += chunk.text;
      },
    })
    .on('a[href]', {
      element(element) {
        const href = element.getAttribute('href') ?? '';
        if (element.getAttribute('class') === 'heading-anchor') return;
        const next = rewriteHref(decodeEntities(href), ctx);
        element.setAttribute('href', next.href);
        if (next.external) {
          element.setAttribute('target', '_blank');
          element.setAttribute('rel', 'noopener noreferrer');
        }
      },
    });

  html = await rewriter.transform(new Response(html)).text();

  const words = stripTags(html).split(' ').length;
  return {
    frontmatter,
    title: frontmatter.title ?? title,
    summary: frontmatter.description ?? summary,
    html,
    headings,
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
}
