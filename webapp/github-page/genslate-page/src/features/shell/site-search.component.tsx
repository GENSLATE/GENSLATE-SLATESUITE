import {
  type CodiconRef,
  CommandPalette,
  type CommandPaletteItem,
  Kbd,
  useHotkey,
  useTheme,
} from '@genslate/design-system';
import { useState } from 'react';

import { useRouter } from '../../app/router/router.context';
import { REPO_LINKS } from '../../app/site.defaults';
import { useIsClient } from '../../components/use-is-client.hook';
import { APPS } from '../../content/apps.content';
import { DOCS } from '../../content/docs.content';

const PAGES: readonly { route: string; label: string; icon: CodiconRef }[] = [
  { route: '/', label: 'Home', icon: 'codicon:home' },
  { route: '/apps/', label: 'All apps', icon: 'codicon:extensions' },
  { route: '/design/', label: 'Design Kit', icon: 'codicon:symbol-color' },
  { route: '/docs/', label: 'Docs', icon: 'codicon:book' },
  { route: '/download/', label: 'Download', icon: 'codicon:cloud-download' },
];

/** Every searchable destination: pages, apps, docs pages and their sections, and actions. */
function useSearchItems(close: () => void): CommandPaletteItem[] {
  const { navigate } = useRouter();
  const { toggleTheme } = useTheme();
  const go = (route: string) => () => {
    close();
    navigate(route);
  };

  return [
    ...PAGES.map((page) => ({
      id: `page:${page.route}`,
      label: page.label,
      group: 'Pages',
      icon: page.icon,
      onSelect: go(page.route),
    })),
    ...APPS.map((app) => ({
      id: `app:${app.id}`,
      label: app.name,
      group: 'Apps',
      icon: 'codicon:window' as const,
      detail: app.tagline,
      keywords: [app.category, ...app.keywords],
      onSelect: go(`/apps/${app.id}/`),
    })),
    ...DOCS.flatMap((doc) => [
      {
        id: `doc:${doc.slug}`,
        label: doc.title,
        group: 'Docs',
        icon: doc.icon,
        detail: doc.section,
        keywords: [doc.description],
        onSelect: go(doc.route),
      },
      ...doc.headings.map((heading) => ({
        id: `doc:${doc.slug}#${heading.id}`,
        label: heading.text,
        group: 'Sections',
        icon: 'codicon:symbol-keyword' as const,
        detail: doc.title,
        onSelect: go(`${doc.route}#${heading.id}`),
      })),
    ]),
    {
      id: 'action:theme',
      label: 'Toggle Polar Night / Snow Storm',
      group: 'Actions',
      icon: 'codicon:color-mode',
      onSelect: () => {
        close();
        toggleTheme();
      },
    },
    {
      id: 'action:github',
      label: 'Open GENSLATE on GitHub',
      group: 'Actions',
      icon: 'codicon:github',
      onSelect: () => {
        close();
        window.open(REPO_LINKS.home, '_blank', 'noopener,noreferrer');
      },
    },
  ];
}

/**
 * The site search: a macOS command-center pill in the header that opens the design system's
 * command palette (⌘K / Ctrl+K, or `/`).
 */
export function SiteSearch({ compact = false }: { readonly compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const items = useSearchItems(() => setOpen(false));
  const isClient = useIsClient();

  useHotkey('mod+k', () => setOpen((value) => !value));
  useHotkey('/', () => setOpen(true));

  return (
    <>
      <button
        type="button"
        data-chrome
        onClick={() => setOpen(true)}
        aria-label="Search apps and docs"
        className={
          compact
            ? 'focus-ring grid size-control-md place-items-center rounded-control text-fg-secondary transition-colors duration-fast hover:bg-fill-hover hover:text-fg-strong'
            : 'focus-ring group flex h-control-md w-60 items-center gap-2 rounded-control border border-command-center-border bg-command-center-bg pr-1.5 pl-2.5 text-fg-muted text-sm transition-colors duration-fast ease-standard hover:bg-command-center-bg-hover hover:text-fg-secondary'
        }
      >
        <span aria-hidden="true" className="codicon codicon-search text-[14px]" />
        {compact ? null : (
          <>
            <span className="flex-1 text-left">Search apps and docs…</span>
            {isClient ? <Kbd shortcut="mod+k" size="sm" /> : null}
          </>
        )}
      </button>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={items}
        placeholder="Search apps, guides and docs…"
        labels={{ title: 'Search GENSLATE', empty: 'Nothing matches that search.' }}
      />
    </>
  );
}
