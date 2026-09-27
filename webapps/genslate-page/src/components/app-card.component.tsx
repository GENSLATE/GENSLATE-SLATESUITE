import { cn, Icon } from '@genslate/design-system';
import type { CSSProperties } from 'react';

import { useRouter } from '../app/router/router.context';
import { CATEGORY_ICONS, type SuiteApp } from '../content/apps.content';
import { AppIcon } from './app-icon.component';
import { AppStatusBadge } from './app-status-badge.component';

/**
 * A suite app as a card: icon, name, status, tagline, category. The whole card is one link; the
 * icon morphs into the app page's hero icon during the page transition.
 */
export function AppCard({
  app,
  index = 0,
  morph = false,
}: {
  readonly app: SuiteApp;
  /** Position, for the reveal stagger. */
  readonly index?: number;
  /** Give the icon a view-transition name (only one card per app on a page). */
  readonly morph?: boolean;
}) {
  const { href } = useRouter();
  return (
    <a
      href={href(`/apps/${app.id}/`)}
      data-nord={app.color}
      style={{ '--reveal-step': index % 4 } as CSSProperties}
      className={cn(
        'reveal spotlight group focus-ring flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-raised/60 p-5 text-fg',
        'shadow-card transition-[translate,box-shadow,border-color] duration-moderate ease-enter',
        'hover:-translate-y-1 hover:border-border hover:no-underline hover:shadow-popover',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="relative">
          <span className="absolute -inset-4 -z-10 bg-app-glow opacity-0 blur-md transition-opacity duration-slow group-hover:opacity-100" />
          <AppIcon
            app={app}
            size={52}
            className="transition-transform duration-slow ease-spring group-hover:-rotate-3 group-hover:scale-105"
            {...(morph ? { transitionName: `app-icon-${app.id}` } : {})}
          />
        </span>
        <AppStatusBadge status={app.status} />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-fg-strong text-lg">{app.name}</h3>
        <p className="mt-1 text-fg-secondary text-md leading-relaxed">{app.tagline}</p>
      </div>
      <div className="flex items-center justify-between text-fg-muted text-sm">
        <span className="flex items-center gap-1.5">
          <Icon name={CATEGORY_ICONS[app.category]} size={14} />
          {app.category}
        </span>
        <Icon
          name="codicon:arrow-right"
          size={16}
          className="-translate-x-1 opacity-0 transition-[translate,opacity] duration-moderate ease-enter group-hover:translate-x-0 group-hover:opacity-100"
        />
      </div>
    </a>
  );
}
