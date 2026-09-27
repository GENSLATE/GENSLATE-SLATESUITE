import { Icon, Kbd } from '@genslate/design-system';
import type { CSSProperties } from 'react';

import { useRouter } from '../../app/router/router.context';
import { LinkButton } from '../../components/link-button.component';
import { Section, SectionHeading } from '../../components/section.component';
import { findApp } from '../../content/apps.content';
import { AppMockup } from '../mockups/mockups.registry';

/** The Launcher, up close: features on the left, the live panel floating on the right. */
export function LauncherSection() {
  const { href } = useRouter();
  const launcher = findApp('launcher');
  if (!launcher) return null;

  return (
    <Section
      labelledBy="launcher-title"
      className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]"
    >
      <div>
        <SectionHeading
          id="launcher-title"
          eyebrow="Launcher · Preview"
          title={
            <>
              One keystroke to <span className="text-ink">every app you carry.</span>
            </>
          }
          lead={launcher.summary}
        />

        <div className="reveal mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle bg-surface-raised/60 px-4 py-3">
          <Kbd shortcut="ctrl+alt+space" platform="windows" />
          <span className="text-fg-secondary text-md">
            opens it from anywhere — then just type.
          </span>
        </div>

        <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {launcher.features.slice(0, 4).map((feature, index) => (
            <li
              key={feature.title}
              className="reveal flex gap-3"
              style={{ '--reveal-step': index } as CSSProperties}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-accent-border bg-accent-subtle text-accent-fg">
                <Icon name={feature.icon} size={16} />
              </span>
              <span>
                <span className="block font-semibold text-fg-strong text-md">{feature.title}</span>
                <span className="mt-1 block text-fg-secondary text-md leading-relaxed">
                  {feature.body}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="reveal mt-10 flex flex-wrap gap-3">
          <LinkButton
            href={href('/apps/launcher/')}
            variant="primary"
            trailingIcon="codicon:arrow-right"
          >
            Meet the Launcher
          </LinkButton>
          <LinkButton href={href('/docs/launcher/')} leadingIcon="codicon:book">
            Read the guide
          </LinkButton>
        </div>
      </div>

      <div className="reveal relative mx-auto w-full max-w-[440px]">
        <div className="absolute -inset-16 -z-10 bg-app-glow blur-2xl" data-nord="nord8" />
        <div className="float">
          <AppMockup id="launcher" />
        </div>
      </div>
    </Section>
  );
}
