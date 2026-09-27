import { CodeBlock, Icon } from '@genslate/design-system';
import type { CSSProperties } from 'react';

import { useRouter } from '../../app/router/router.context';
import { CtaBand } from '../../components/cta-band.component';
import { LinkButton } from '../../components/link-button.component';
import { Section, SectionHeading } from '../../components/section.component';
import { ThemeCompare } from '../../components/theme-compare.component';
import { ComponentPlayground } from './component-playground.component';
import { NordPalette } from './nord-palette.component';

const PRINCIPLES = [
  {
    title: 'Chrome recedes, content leads',
    body: 'Titlebars, sidebars and status bars are quiet, low-contrast layers. Hierarchy comes from type and spacing, not boxes.',
  },
  {
    title: 'Flat at rest, depth when floating',
    body: 'Resting surfaces are separated by hairlines. Only popovers, menus and dialogs lift, with a soft macOS shadow.',
  },
  {
    title: 'One accent, used sparingly',
    body: 'Frost marks focus, selection and the primary action. Aurora colours only ever mean status.',
  },
  {
    title: 'macOS feel',
    body: '13px Inter with optical sizing, 6 / 8 / 12px radii, source-list sidebars and spring motion on toggles.',
  },
  {
    title: 'VS Code density',
    body: 'Tree rows 22px, menu items 24, controls 28, tabs 36, status bar 24 — compact enough for real work.',
  },
  {
    title: 'Every state, every theme',
    body: 'Rest, hover, pressed, focus, selected, disabled, invalid and loading — in both themes, at every scale.',
  },
] as const;

const TYPE_SCALE = [
  { token: 'text-3xl', px: '30 / 36', sample: 'Display heading' },
  { token: 'text-2xl', px: '24 / 30', sample: 'Page title' },
  { token: 'text-xl', px: '20 / 26', sample: 'Section title' },
  { token: 'text-lg', px: '16 / 22', sample: 'Dialog title' },
  { token: 'text-md', px: '14 / 20', sample: 'Emphasised body' },
  { token: 'text-base', px: '13 / 18', sample: 'The default — every control and list row' },
  { token: 'text-sm', px: '12 / 16', sample: 'Secondary text, captions and badges' },
  { token: 'text-xs', px: '11 / 16', sample: 'Status bar, section labels' },
] as const;

const USAGE = `import { Button, Switch, useTheme } from '@genslate/design-system';

export function Toolbar() {
  const { toggleTheme } = useTheme();
  return (
    <div className="flex items-center gap-2 bg-surface-sidebar px-3 hairline-b">
      <Button variant="primary" leadingIcon="codicon:play">Run</Button>
      <Switch label="Watch" defaultChecked />
      <Button variant="ghost" onClick={toggleTheme}>Theme</Button>
    </div>
  );
}`;

/** The design system as a showcase: principles, palette, type, live components. */
export function DesignPage() {
  const { href } = useRouter();
  return (
    <>
      <div className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dots" />
        <div className="mx-auto max-w-site px-4 pt-16 pb-6 text-center sm:px-6 md:pt-24">
          <SectionHeading
            level={1}
            align="center"
            eyebrow="GENSLATE Design Kit"
            title={
              <>
                Nord, refined like macOS, <span className="text-ink">dense like VS Code.</span>
              </>
            }
            lead="One typed token source generates both themes, a Tailwind v4 theme and Rust constants. Fifty-plus accessible React components on Base UI turn it into every GENSLATE window."
          />
          <div className="reveal mt-9 flex flex-wrap justify-center gap-3">
            <LinkButton
              href={href('/apps/example/')}
              variant="primary"
              trailingIcon="codicon:arrow-right"
            >
              See the Design Kit app
            </LinkButton>
            <LinkButton href={href('/docs/developers/design-system/')} leadingIcon="codicon:book">
              Design system docs
            </LinkButton>
          </div>
        </div>
      </div>

      <Section labelledBy="playground-title" className="pt-10 md:pt-14">
        <SectionHeading
          id="playground-title"
          eyebrow="Live components"
          title="Not screenshots. The real thing."
          lead="Everything in this window is a GENSLATE component running in your browser — click, type, tab through it, then switch themes."
        />
        <div className="reveal mt-12">
          <ComponentPlayground />
        </div>
      </Section>

      <Section labelledBy="principles-title">
        <SectionHeading
          id="principles-title"
          eyebrow="Principles"
          title="Six rules every pixel follows."
        />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((principle, index) => (
            <li
              key={principle.title}
              className="reveal spotlight rounded-2xl border border-border-subtle bg-surface-raised/60 p-6 shadow-card"
              style={{ '--reveal-step': index % 3 } as CSSProperties}
            >
              <span className="font-mono font-semibold text-accent-fg text-sm tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 font-semibold text-fg-strong text-lg">{principle.title}</h3>
              <p className="mt-2 text-fg-secondary text-md leading-relaxed">{principle.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="palette-title">
        <SectionHeading
          id="palette-title"
          eyebrow="Colour"
          title="Sixteen colours, carefully mapped."
          lead="Polar Night and Snow Storm are the surfaces, Frost is the accent, Aurora means status. Where Nord's stock pairings miss WCAG AA, the tokens use derived shades. Click a colour to copy it."
        />
        <div className="reveal mt-12">
          <NordPalette />
        </div>
      </Section>

      <Section labelledBy="type-title" className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading
          id="type-title"
          eyebrow="Typography"
          title="Inter, tuned for 13px."
          lead="Optical sizing, tabular numbers in data and tracking that tightens as sizes grow. JetBrains Mono for code. The system font on macOS."
        />
        <div className="reveal divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised/60">
          {TYPE_SCALE.map((row) => (
            <div key={row.token} className="flex items-baseline gap-4 px-5 py-3.5">
              <span className="w-20 shrink-0 font-mono text-fg-muted text-xs">{row.token}</span>
              <span className="w-16 shrink-0 font-mono text-fg-disabled text-xs tabular-nums">
                {row.px}
              </span>
              <span className={`${row.token} truncate text-fg-strong`}>{row.sample}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section labelledBy="compare-title">
        <SectionHeading
          id="compare-title"
          align="center"
          eyebrow="Design Kit app"
          title="Every component. Every state. Both themes."
          lead="The Design Kit is a desktop app of its own — the living catalogue every GENSLATE app is built from. These are real screenshots."
        />
        <div className="reveal mx-auto mt-12 max-w-5xl">
          <ThemeCompare app="example" />
        </div>
      </Section>

      <Section
        labelledBy="usage-title"
        className="grid items-center gap-12 lg:grid-cols-[1fr_1.3fr]"
      >
        <div>
          <SectionHeading
            id="usage-title"
            eyebrow="For developers"
            title="Tokens in, beautiful windows out."
            lead="Components style themselves only through token utilities — bg-surface, text-fg-muted, h-control-md — so themes swap automatically and nothing drifts."
          />
          <ul className="reveal mt-8 grid gap-3 text-fg-secondary text-md">
            {[
              'Base UI primitives: accessible, unstyled, composable',
              'Tailwind CSS v4 with tailwind-variants recipes',
              'React 19 + the React Compiler',
              'Codicons at 16px, Lucide where no Codicon fits',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <Icon name="codicon:check" size={16} className="text-success-fg" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal">
          <CodeBlock code={USAGE} language="tsx" title="toolbar.component.tsx" />
        </div>
      </Section>

      <CtaBand
        title="Build something beautiful."
        lead="The design system ships inside the GENSLATE monorepo, ready for your own Tauri apps."
      />
    </>
  );
}
