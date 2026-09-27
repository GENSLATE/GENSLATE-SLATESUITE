import type { CSSProperties } from 'react';

import { useRouter } from '../../app/router/router.context';
import { LinkButton } from '../../components/link-button.component';
import { Section, SectionHeading } from '../../components/section.component';
import { ThemeCompare } from '../../components/theme-compare.component';

const PALETTE = [
  { group: 'Polar Night', colors: ['--gs-nord-0', '--gs-nord-1', '--gs-nord-2', '--gs-nord-3'] },
  { group: 'Snow Storm', colors: ['--gs-nord-4', '--gs-nord-5', '--gs-nord-6'] },
  { group: 'Frost', colors: ['--gs-nord-7', '--gs-nord-8', '--gs-nord-9', '--gs-nord-10'] },
  {
    group: 'Aurora',
    colors: ['--gs-nord-11', '--gs-nord-12', '--gs-nord-13', '--gs-nord-14', '--gs-nord-15'],
  },
] as const;

/** Polar Night vs Snow Storm on a live window, and the sixteen Nord colours. */
export function ThemesSection() {
  const { href } = useRouter();
  return (
    <Section labelledBy="themes-title">
      <SectionHeading
        id="themes-title"
        align="center"
        eyebrow="Official Nord"
        title="Polar Night. Snow Storm. Both first-class."
        lead="Every component is designed, contrast-checked and screenshot-reviewed in both themes. Drag the divider to compare — or follow your system and let GENSLATE switch for you."
      />
      <div className="reveal mx-auto mt-14 max-w-5xl">
        <ThemeCompare app="coder" />
      </div>
      <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PALETTE.map((group, groupIndex) => (
          <div
            key={group.group}
            className="reveal"
            style={{ '--reveal-step': groupIndex } as CSSProperties}
          >
            <p className="mb-2 font-semibold text-fg-muted text-xs uppercase tracking-wider">
              {group.group}
            </p>
            <div className="flex h-12 overflow-hidden rounded-xl border border-border-subtle shadow-card">
              {group.colors.map((color) => (
                <span
                  key={color}
                  title={color.replace('--gs-', '')}
                  className="flex-1 transition-[flex-grow] duration-moderate ease-enter hover:flex-[2.2]"
                  style={{ background: `var(${color})` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="reveal mt-12 text-center">
        <LinkButton href={href('/design/')} trailingIcon="codicon:arrow-right">
          Explore the Design Kit
        </LinkButton>
      </div>
    </Section>
  );
}
