import { Icon } from '@genslate/design-system';
import { type ReactNode, useState } from 'react';

import { DocsSidebar } from './docs-sidebar.component';

/**
 * Three columns like an editor: the docs source list (sticky, persists across page transitions),
 * the article, and an optional outline. On small screens the list folds into a disclosure.
 */
export function DocsLayout({
  current,
  outline,
  children,
}: {
  readonly current?: string;
  readonly outline?: ReactNode;
  readonly children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="mx-auto grid max-w-[90rem] gap-x-10 px-4 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_216px]">
      <aside
        className="sticky top-header hidden max-h-[calc(100dvh-var(--spacing-header))] self-start overflow-y-auto py-8 [scrollbar-width:thin] lg:block"
        style={{ viewTransitionName: 'docs-sidebar' }}
      >
        <DocsSidebar {...(current !== undefined ? { current } : {})} />
      </aside>

      <div className="min-w-0 py-8 lg:py-12">
        <div className="mb-6 lg:hidden">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="docs-mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
            className="focus-ring flex h-10 w-full items-center gap-2 rounded-lg border border-border-subtle bg-surface-raised px-3 text-fg text-md shadow-card"
          >
            <Icon name="codicon:list-tree" size={16} className="text-fg-muted" />
            Docs menu
            <Icon
              name="codicon:chevron-down"
              size={16}
              className={`ml-auto text-fg-muted transition-transform duration-base ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {menuOpen ? (
            <div
              id="docs-mobile-nav"
              className="mt-2 rounded-lg border border-border-subtle bg-surface-sidebar py-2"
            >
              <DocsSidebar {...(current !== undefined ? { current } : {})} />
            </div>
          ) : null}
        </div>
        {children}
      </div>

      {outline ? (
        <aside className="sticky top-header hidden max-h-[calc(100dvh-var(--spacing-header))] self-start overflow-y-auto py-12 xl:block">
          {outline}
        </aside>
      ) : null}
    </div>
  );
}
