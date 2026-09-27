import type { CSSProperties } from 'react';

import { useRouter } from '../../app/router/router.context';
import { AppCard } from '../../components/app-card.component';
import { LinkButton } from '../../components/link-button.component';
import { Section, SectionHeading } from '../../components/section.component';
import { APPS } from '../../content/apps.content';

const STATS = [
  { value: '13', label: 'apps in one suite' },
  { value: '50+', label: 'design-kit components' },
  { value: '2', label: 'Nord themes, both first-class' },
  { value: '3', label: 'platforms from one codebase' },
] as const;

/** Key numbers, then every app as a card. */
export function SuiteSection() {
  const { href } = useRouter();
  return (
    <>
      <div className="mx-auto max-w-site px-4 pt-16 sm:px-6">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border-subtle bg-border-subtle md:grid-cols-4">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className="reveal bg-canvas px-6 py-7 text-center"
              style={{ '--reveal-step': index } as CSSProperties}
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-semibold text-display text-ink tabular-nums">
                  {stat.value}
                </span>
                <span className="mt-1 block text-fg-muted text-md">{stat.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <Section labelledBy="suite-title">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="suite-title"
            eyebrow="The suite"
            title="Everything you need. Nothing to install."
            lead="Thirteen apps that share one design language, one settings format and one folder you can carry anywhere. Start with the Launcher; the rest arrive one by one."
          />
          <LinkButton href={href('/apps/')} trailingIcon="codicon:arrow-right" className="reveal">
            All apps
          </LinkButton>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {APPS.map((app, index) => (
            <AppCard key={app.id} app={app} index={index} />
          ))}
        </div>
      </Section>
    </>
  );
}
