import { Icon } from '@genslate/design-system';
import type { CSSProperties } from 'react';

import { useRouter } from '../../app/router/router.context';
import { REPO_LINKS } from '../../app/site.defaults';
import { DOC_GROUPS } from '../../content/docs.content';
import { DocsLayout } from './docs-layout.component';

const SECTION_BLURBS: Readonly<Record<string, string>> = {
  'Get started': 'What GENSLATE is, how to install it and how portable mode works.',
  'Using GENSLATE': 'Themes, settings files, keyboard shortcuts and answers to common questions.',
  'The apps': 'Guides for each app in the suite, and what is coming next.',
  Developers: 'Architecture, the design system, IPC, testing and releases — for contributors.',
};

/** Docs landing: every section as a card listing its pages. */
export function DocsHomePage() {
  const { href } = useRouter();
  return (
    <DocsLayout>
      <header className="relative">
        <p className="font-semibold text-accent-fg text-sm uppercase tracking-[0.14em]">
          Docs & wiki
        </p>
        <h1 className="mt-3 font-semibold text-display">
          Learn <span className="text-ink">GENSLATE</span>
        </h1>
        <p className="mt-4 max-w-2xl text-fg-secondary text-lead">
          Guides for everyday use, and the developer documentation straight from the repository.
          Press{' '}
          <kbd className="rounded border border-border bg-control px-1.5 font-mono text-sm">/</kbd>{' '}
          to search everything.
        </p>
      </header>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {DOC_GROUPS.map((group, index) => (
          <section
            key={group.title}
            aria-labelledby={`docs-group-${index}`}
            className="reveal spotlight rounded-2xl border border-border-subtle bg-surface-raised/60 p-6 shadow-card"
            style={{ '--reveal-step': index % 2 } as CSSProperties}
          >
            <h2 id={`docs-group-${index}`} className="font-semibold text-xl">
              {group.title}
            </h2>
            <p className="mt-1.5 text-fg-muted text-md">{SECTION_BLURBS[group.title] ?? ''}</p>
            <ul className="mt-5 grid gap-1">
              {group.pages.map((page) => (
                <li key={page.slug}>
                  <a
                    href={href(page.route)}
                    className="group focus-ring -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-fill-hover hover:no-underline"
                  >
                    <Icon name={page.icon} size={16} className="text-accent-fg" />
                    <span className="flex-1">
                      <span className="block font-medium text-fg-strong text-md">{page.title}</span>
                      {page.description ? (
                        <span className="line-clamp-1 block text-fg-muted text-sm">
                          {page.description}
                        </span>
                      ) : null}
                    </span>
                    <Icon
                      name="codicon:chevron-right"
                      size={14}
                      className="text-fg-muted opacity-0 transition-opacity duration-fast group-hover:opacity-100"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="reveal mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border-subtle border-dashed p-5 text-fg-secondary text-md">
        <Icon name="codicon:comment-discussion" size={20} className="text-accent-fg" />
        <span className="flex-1">
          Something missing or unclear? Open an issue and it will be fixed.
        </span>
        <a
          href={REPO_LINKS.issues}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium"
        >
          Open an issue →
        </a>
      </div>
    </DocsLayout>
  );
}
