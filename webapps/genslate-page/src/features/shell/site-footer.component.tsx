import {
  SegmentedControl,
  SegmentedControlItem,
  StatusBar,
  StatusBarItem,
  StatusBarSection,
  type ThemePreference,
  useTheme,
} from '@genslate/design-system';
import SITE_PACKAGE from '../../../package.json';
import { useRouter } from '../../app/router/router.context';
import { REPO_LINKS } from '../../app/site.defaults';
import { BrandMark } from '../../components/brand-mark.component';
import { useIsClient } from '../../components/use-is-client.hook';
import { APPS } from '../../content/apps.content';

const COLUMNS = [
  {
    title: 'Suite',
    links: [
      { label: 'All apps', route: '/apps/' },
      ...APPS.filter((app) => app.status === 'preview').map((app) => ({
        label: app.name,
        route: `/apps/${app.id}/`,
      })),
      { label: 'Download', route: '/download/' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Introduction', route: '/docs/introduction/' },
      { label: 'Install & run', route: '/docs/installation/' },
      { label: 'Keyboard shortcuts', route: '/docs/keyboard-shortcuts/' },
      { label: 'FAQ', route: '/docs/faq/' },
    ],
  },
  {
    title: 'Build',
    links: [
      { label: 'Design Kit', route: '/design/' },
      { label: 'Architecture', route: '/docs/developers/architecture/' },
      { label: 'Contributing', route: '/docs/developers/contributing/' },
      { label: 'Security', route: '/docs/developers/security/' },
    ],
  },
] as const;

const THEME_LABELS: Readonly<Record<ThemePreference, string>> = {
  system: 'System',
  'polar-night': 'Polar Night',
  'snow-storm': 'Snow Storm',
};

/** Link columns, a theme picker, and a status bar signature like the apps'. */
export function SiteFooter() {
  const { href } = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();

  return (
    <footer className="mt-24 border-border-subtle border-t bg-surface-sidebar">
      <div className="mx-auto grid max-w-site gap-12 px-4 pt-14 pb-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <a
            href={href('/')}
            className="mark focus-ring -ml-1 inline-flex items-center gap-2.5 rounded-control p-1 text-fg-strong hover:no-underline"
          >
            <BrandMark className="size-7" />
            <span className="font-semibold text-sm tracking-[0.16em]">GENSLATE</span>
          </a>
          <p className="mt-3 text-fg-muted text-md leading-relaxed">
            Beautiful, portable desktop apps for Windows, macOS and Linux — themed in official Nord,
            built with Tauri and Rust.
          </p>
          <div className="mt-6">
            <p
              id="footer-theme"
              className="mb-2 font-medium text-fg-muted text-xs uppercase tracking-wider"
            >
              Theme
            </p>
            <SegmentedControl
              aria-labelledby="footer-theme"
              size="sm"
              value={isClient ? theme : 'system'}
              onValueChange={(value) => setTheme(value as ThemePreference)}
            >
              <SegmentedControlItem value="system" icon="codicon:vm" label="System" />
              <SegmentedControlItem value="polar-night">Polar Night</SegmentedControlItem>
              <SegmentedControlItem value="snow-storm">Snow Storm</SegmentedControlItem>
            </SegmentedControl>
          </div>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="font-semibold text-fg-muted text-xs uppercase tracking-wider">
              {column.title}
            </h2>
            <ul className="mt-4 grid gap-2.5">
              {column.links.map((link) => (
                <li key={link.route}>
                  <a
                    href={href(link.route)}
                    className="text-fg-secondary text-md transition-colors duration-fast hover:text-fg-strong hover:no-underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <StatusBar aria-label="Site status" className="w-full">
        <StatusBarSection>
          <StatusBarItem accent icon="codicon:remote">
            GENSLATE
          </StatusBarItem>
          <StatusBarItem icon="codicon:color-mode">
            {isClient ? THEME_LABELS[resolvedTheme] : 'Nord'}
          </StatusBarItem>
          <StatusBarItem icon="codicon:source-control">main</StatusBarItem>
        </StatusBarSection>
        <StatusBarSection align="end">
          <StatusBarItem icon="codicon:law">© {new Date().getFullYear()} GENSLATE</StatusBarItem>
          <StatusBarItem
            icon="codicon:github"
            label="Source on GitHub"
            onClick={() => window.open(REPO_LINKS.home, '_blank', 'noopener,noreferrer')}
          >
            Source
          </StatusBarItem>
          <StatusBarItem>v{SITE_PACKAGE.version}</StatusBarItem>
        </StatusBarSection>
      </StatusBar>
    </footer>
  );
}
