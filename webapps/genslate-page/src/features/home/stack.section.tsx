import { type CodiconRef, Icon } from '@genslate/design-system';
import type { CSSProperties } from 'react';

import { Section, SectionHeading } from '../../components/section.component';

const STACK: readonly { name: string; icon: CodiconRef }[] = [
  { name: 'Tauri 2', icon: 'codicon:window' },
  { name: 'Rust', icon: 'codicon:gear' },
  { name: 'React 19', icon: 'codicon:symbol-misc' },
  { name: 'Base UI', icon: 'codicon:layers' },
  { name: 'Tailwind CSS v4', icon: 'codicon:symbol-color' },
  { name: 'TypeScript 7', icon: 'codicon:symbol-namespace' },
  { name: 'Bun', icon: 'codicon:rocket' },
  { name: 'moon', icon: 'codicon:circle-large' },
  { name: 'Vite 8', icon: 'codicon:flame' },
  { name: 'Nord', icon: 'codicon:color-mode' },
];

const PRINCIPLES: readonly { icon: CodiconRef; title: string; body: string }[] = [
  {
    icon: 'codicon:dashboard',
    title: 'Native speed, tiny downloads',
    body: 'Tauri uses the operating system’s own webview and a Rust core — no bundled browser engine in every app.',
  },
  {
    icon: 'codicon:lock',
    title: 'Secure by default',
    body: 'Least-privilege capabilities, a strict Content-Security-Policy, pinned dependencies and audited supply chain.',
  },
  {
    icon: 'codicon:record-keys',
    title: 'Keyboard-complete',
    body: 'Every action has a shortcut, every control a visible focus ring. Built to WCAG 2.2 AA.',
  },
];

/** What GENSLATE is built with, and the engineering promises that follow. */
export function StackSection() {
  const row = [...STACK, ...STACK];
  return (
    <Section labelledBy="stack-title">
      <SectionHeading
        id="stack-title"
        align="center"
        eyebrow="Under the hood"
        title="Modern to the core."
        lead="A Rust core and a React interface, bundled per platform by Tauri, built and tested with Bun and moon. Every dependency is pinned to its latest stable release."
      />

      <div className="marquee reveal relative mt-12 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <ul className="marquee-track flex w-max gap-3" aria-label="Technologies">
          {row.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              aria-hidden={index >= STACK.length || undefined}
              className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border-subtle bg-surface-raised/70 px-4 py-2 font-medium text-fg text-md shadow-card"
            >
              <Icon name={item.icon} size={16} className="text-accent-fg" />
              {item.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {PRINCIPLES.map((principle, index) => (
          <div
            key={principle.title}
            className="reveal spotlight rounded-2xl border border-border-subtle bg-surface-raised/60 p-6 shadow-card"
            style={{ '--reveal-step': index } as CSSProperties}
          >
            <Icon name={principle.icon} size={20} className="text-accent-fg" />
            <h3 className="mt-4 font-semibold text-fg-strong text-lg">{principle.title}</h3>
            <p className="mt-2 text-fg-secondary text-md leading-relaxed">{principle.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
