import { Banner, Icon } from '@genslate/design-system';
import type { CSSProperties } from 'react';

import { useRouter } from '../../app/router/router.context';
import { REPO_LINKS } from '../../app/site.defaults';
import { AppCard } from '../../components/app-card.component';
import { AppIcon } from '../../components/app-icon.component';
import { AppStatusBadge } from '../../components/app-status-badge.component';
import { LinkButton } from '../../components/link-button.component';
import { Section, SectionHeading } from '../../components/section.component';
import { APPS, CATEGORY_ICONS, type SuiteApp } from '../../content/apps.content';
import { AppMockup } from '../mockups/mockups.registry';

/** One app: hero with its window, features, and related apps. */
export function AppPage({ app }: { readonly app: SuiteApp }) {
  const { href } = useRouter();
  const related = APPS.filter((other) => other.id !== app.id && other.category === app.category)
    .concat(APPS.filter((other) => other.id !== app.id && other.category !== app.category))
    .slice(0, 4);
  const narrow = app.id === 'launcher';

  return (
    <>
      <section
        aria-labelledby="app-title"
        data-nord={app.color}
        className="relative isolate overflow-x-clip"
      >
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dots" />
        <div
          aria-hidden="true"
          className="absolute -top-40 left-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 bg-app-glow opacity-80 blur-3xl"
        />

        <div className="mx-auto max-w-site px-4 pt-14 sm:px-6 md:pt-20">
          <nav aria-label="Breadcrumb" className="intro text-fg-muted text-sm">
            <a href={href('/apps/')} className="text-fg-muted hover:text-fg-strong">
              Apps
            </a>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <span aria-current="page" className="text-fg-secondary">
              {app.name}
            </span>
          </nav>

          <div
            className={narrow ? 'mt-8 grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]' : 'mt-8'}
          >
            <div className={narrow ? '' : 'mx-auto max-w-3xl text-center'}>
              <div
                className={narrow ? 'intro' : 'intro flex justify-center'}
                style={{ '--intro-step': 1 } as CSSProperties}
              >
                <AppIcon
                  app={app}
                  size={96}
                  frame="full"
                  transitionName={`app-icon-${app.id}`}
                  className="-m-2"
                />
              </div>
              <div
                className={`intro mt-5 flex flex-wrap items-center gap-2 ${narrow ? '' : 'justify-center'}`}
                style={{ '--intro-step': 2 } as CSSProperties}
              >
                <AppStatusBadge status={app.status} />
                <span className="flex items-center gap-1.5 text-fg-muted text-sm">
                  <Icon name={CATEGORY_ICONS[app.category]} size={14} />
                  {app.category}
                </span>
              </div>
              <h1
                id="app-title"
                className="intro mt-4 font-semibold text-hero"
                style={{ '--intro-step': 3 } as CSSProperties}
              >
                {app.name}
              </h1>
              <p
                className="intro mt-4 font-medium text-fg-strong text-title"
                style={{ '--intro-step': 4 } as CSSProperties}
              >
                {app.headline}
              </p>
              <p
                className="intro mt-4 text-fg-secondary text-lead"
                style={{ '--intro-step': 5 } as CSSProperties}
              >
                {app.summary}
              </p>
              <div
                className={`intro mt-8 flex flex-wrap gap-3 ${narrow ? '' : 'justify-center'}`}
                style={{ '--intro-step': 6 } as CSSProperties}
              >
                {app.status === 'preview' ? (
                  <LinkButton
                    href={href('/download/')}
                    variant="primary"
                    leadingIcon="codicon:cloud-download"
                  >
                    Get {app.name}
                  </LinkButton>
                ) : (
                  <LinkButton
                    href={REPO_LINKS.home}
                    external
                    variant="primary"
                    leadingIcon="codicon:eye"
                  >
                    Watch on GitHub
                  </LinkButton>
                )}
                {app.guide ? (
                  <LinkButton href={href(`/docs/${app.guide}/`)} leadingIcon="codicon:book">
                    Read the guide
                  </LinkButton>
                ) : null}
              </div>
            </div>

            <div
              className={
                narrow
                  ? 'intro relative mx-auto w-full max-w-[420px]'
                  : 'intro relative mx-auto mt-14 max-w-[1080px]'
              }
              style={{ '--intro-step': 5 } as CSSProperties}
            >
              <div className={narrow ? 'float' : ''}>
                <AppMockup id={app.id} />
              </div>
            </div>
          </div>

          {app.status === 'planned' ? (
            <Banner tone="info" title="Design preview" className="reveal mx-auto mt-10 max-w-3xl">
              {app.name} is planned. The window above is a live preview built from the GENSLATE
              design kit — it shows where the app is headed, not a finished product.
            </Banner>
          ) : null}
        </div>
      </section>

      <Section labelledBy="features-title">
        <SectionHeading id="features-title" eyebrow="Features" title={`What ${app.name} does`} />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {app.features.map((feature, index) => (
            <div
              key={feature.title}
              data-nord={app.color}
              className="reveal spotlight rounded-2xl border border-border-subtle bg-surface-raised/60 p-6 shadow-card"
              style={{ '--reveal-step': index % 3 } as CSSProperties}
            >
              <span className="grid size-10 place-items-center rounded-xl border border-accent-border bg-accent-subtle text-accent-fg">
                <Icon name={feature.icon} size={20} />
              </span>
              <h3 className="mt-4 font-semibold text-fg-strong text-lg">{feature.title}</h3>
              <p className="mt-2 text-fg-secondary text-md leading-relaxed">{feature.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section labelledBy="related-title" className="pt-0 md:pt-0">
        <SectionHeading id="related-title" eyebrow="Part of the suite" title="More from GENSLATE" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((other, index) => (
            <AppCard key={other.id} app={other} index={index} />
          ))}
        </div>
      </Section>
    </>
  );
}
