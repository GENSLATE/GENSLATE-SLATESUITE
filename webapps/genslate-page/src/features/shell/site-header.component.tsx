import { cn, IconButton } from '@genslate/design-system';
import { useState } from 'react';

import { useRouter } from '../../app/router/router.context';
import { REPO_LINKS } from '../../app/site.defaults';
import { BrandMark } from '../../components/brand-mark.component';
import { SiteSearch } from './site-search.component';
import { ThemeToggle } from './theme-toggle.component';

export const NAV_ITEMS = [
  { route: '/apps/', label: 'Apps' },
  { route: '/design/', label: 'Design Kit' },
  { route: '/docs/', label: 'Docs' },
  { route: '/download/', label: 'Download' },
] as const;

/**
 * The site header: a VS Code-dense bar that is transparent over the hero and becomes macOS glass
 * once the page scrolls. It persists across page transitions (`view-transition-name`).
 */
export function SiteHeader() {
  const { route, href } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (target: string) => route.path.startsWith(target);

  return (
    <header
      data-chrome
      className="site-header sticky top-0 z-sticky"
      style={{ viewTransitionName: 'site-header' }}
    >
      <div className="mx-auto flex h-header max-w-site items-center gap-3 px-4 sm:px-6">
        <a
          href={href('/')}
          className="mark focus-ring -ml-1.5 flex items-center gap-2.5 rounded-control px-1.5 py-1 text-fg-strong hover:no-underline"
          aria-label="GENSLATE home"
        >
          <BrandMark className="size-6" />
          <span className="font-semibold text-[13px] tracking-[0.16em]">GENSLATE</span>
        </a>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-0.5 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.route}
              href={href(item.route)}
              aria-current={isActive(item.route) ? 'page' : undefined}
              className={cn(
                'focus-ring relative rounded-control px-3 py-1.5 font-medium text-fg-secondary text-md transition-colors duration-fast ease-standard',
                'hover:bg-fill-hover hover:text-fg-strong hover:no-underline',
                'aria-[current=page]:text-fg-strong',
                'after:absolute after:inset-x-3 after:-bottom-[11px] after:h-0.5 after:rounded-full after:bg-accent after:opacity-0 after:transition-opacity aria-[current=page]:after:opacity-100',
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <div className="hidden lg:block">
            <SiteSearch />
          </div>
          <div className="lg:hidden">
            <SiteSearch compact />
          </div>
          <ThemeToggle />
          <IconButton
            label="GENSLATE on GitHub"
            icon="codicon:github"
            nativeButton={false}
            render={<a href={REPO_LINKS.home} target="_blank" rel="noopener noreferrer" />}
          />
          <IconButton
            className="md:hidden"
            label={menuOpen ? 'Close menu' : 'Open menu'}
            icon={menuOpen ? 'codicon:close' : 'codicon:menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            tooltip={false}
            onClick={() => setMenuOpen((open) => !open)}
          />
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="surface-glass hairline-b grid gap-1 px-4 pt-1 pb-4 md:hidden"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.route}
              href={href(item.route)}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(item.route) ? 'page' : undefined}
              className="focus-ring rounded-control px-3 py-2.5 font-medium text-fg text-lg hover:bg-fill-hover hover:no-underline aria-[current=page]:bg-accent-subtle aria-[current=page]:text-accent-fg"
            >
              {item.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
