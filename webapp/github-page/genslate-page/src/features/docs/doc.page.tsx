import { Icon } from '@genslate/design-system';

import { useRouter } from '../../app/router/router.context';
import { SITE_DEFAULTS } from '../../app/site.defaults';
import type { DocEntry } from '../../content/content.types';
import { neighbours } from '../../content/docs.content';
import { DocOutline } from './doc-outline.component';
import { DocsLayout } from './docs-layout.component';

function PagerLink({
  doc,
  direction,
}: {
  readonly doc: DocEntry;
  readonly direction: 'previous' | 'next';
}) {
  const { href } = useRouter();
  const next = direction === 'next';
  return (
    <a
      href={href(doc.route)}
      rel={next ? 'next' : 'prev'}
      className={`group focus-ring spotlight flex flex-col gap-1 rounded-xl border border-border-subtle bg-surface-raised/60 p-4 shadow-card transition-[border-color,translate] duration-moderate ease-enter hover:-translate-y-0.5 hover:border-accent-border hover:no-underline ${next ? 'items-end text-right' : ''}`}
    >
      <span className="flex items-center gap-1 text-fg-muted text-xs uppercase tracking-wider">
        {next ? null : <Icon name="codicon:arrow-left" size={12} />}
        {next ? 'Next' : 'Previous'}
        {next ? <Icon name="codicon:arrow-right" size={12} /> : null}
      </span>
      <span className="font-semibold text-fg-strong text-md group-hover:text-accent-fg">
        {doc.title}
      </span>
    </a>
  );
}

/** One wiki or developer docs page, rendered from Markdown at build time. */
export function DocPage({ doc, html }: { readonly doc: DocEntry; readonly html: string }) {
  const { href } = useRouter();
  const { previous, next } = neighbours(doc.slug);
  const editUrl = `${SITE_DEFAULTS.repoUrl}/edit/${SITE_DEFAULTS.branch}/${doc.source}`;

  return (
    <DocsLayout current={doc.slug} outline={<DocOutline headings={doc.headings} />}>
      <div
        aria-hidden="true"
        className="read-progress fixed inset-x-0 top-header z-sticky h-0.5 bg-accent"
      />
      <article className="mx-auto max-w-prose xl:mx-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-fg-muted text-sm">
          <a href={href('/docs/')} className="text-fg-muted hover:text-fg-strong">
            Docs
          </a>
          <Icon name="codicon:chevron-right" size={12} />
          <span>{doc.section}</span>
        </nav>
        <header className="mt-4 border-border-subtle border-b pb-8">
          <h1 className="font-semibold text-display">{doc.title}</h1>
          {doc.description ? (
            <p className="mt-4 text-fg-secondary text-lead">{doc.description}</p>
          ) : null}
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-fg-muted text-sm">
            <span className="flex items-center gap-1.5">
              <Icon name="codicon:watch" size={14} /> {doc.readingMinutes} min read
            </span>
            <a
              href={editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-fg-muted hover:text-accent-fg"
            >
              <Icon name="codicon:edit" size={14} /> Edit on GitHub
            </a>
          </p>
        </header>

        <div
          className="prose mt-8"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: build-time HTML rendered from this repository's own Markdown (plugins/markdown.ts), never user input
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {previous || next ? (
          <nav aria-label="More docs" className="mt-16 grid gap-3 sm:grid-cols-2">
            {previous ? <PagerLink doc={previous} direction="previous" /> : <span />}
            {next ? <PagerLink doc={next} direction="next" /> : null}
          </nav>
        ) : null}
      </article>
    </DocsLayout>
  );
}
