import {
  Badge,
  Banner,
  CodeBlock,
  type CodiconRef,
  cn,
  guessPlatform,
  Icon,
} from '@genslate/design-system';
import type { CSSProperties } from 'react';

import { useRouter } from '../../app/router/router.context';
import { REPO_LINKS } from '../../app/site.defaults';
import { LinkButton } from '../../components/link-button.component';
import { Section, SectionHeading } from '../../components/section.component';
import { useIsClient } from '../../components/use-is-client.hook';

type Os = 'windows' | 'macos' | 'linux';

const PLATFORMS: readonly {
  id: Os;
  name: string;
  icon: CodiconRef;
  formats: readonly string[];
  requires: string;
}[] = [
  {
    id: 'windows',
    name: 'Windows',
    icon: 'codicon:window',
    formats: ['Portable .zip (x64 · ARM64)', 'Light installer (planned)'],
    requires: 'Windows 10 or 11 with the WebView2 runtime (built into Windows 11).',
  },
  {
    id: 'macos',
    name: 'macOS',
    icon: 'codicon:vm',
    formats: ['.app in a .zip (Apple silicon · Intel)'],
    requires: 'macOS 10.15 Catalina or later.',
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: 'codicon:terminal-linux',
    formats: ['AppImage', '.deb · .rpm'],
    requires: 'A desktop with WebKitGTK 4.1 (Ubuntu 22.04+, Fedora 38+ or similar).',
  },
];

const PACKAGES = [
  {
    title: 'The suite',
    icon: 'codicon:layers' as const,
    body: 'The Launcher plus every available app in one folder, with your portable Desktop, Documents, Music, Pictures and Videos. Unzip it onto a USB drive and go.',
    path: 'GENSLATE/',
  },
  {
    title: 'A single app',
    icon: 'codicon:window' as const,
    body: 'Just one app in its own zip. It keeps its settings beside the executable, and joins the suite later if you drop it into programs/genslate/.',
    path: 'GENSLATE-Launcher/',
  },
];

const BUILD = `# 1 · Clone, then let proto install the pinned moon, Bun and Rust
git clone ${REPO_LINKS.home}.git && cd GENSLATE
proto install && bun run setup

# 2 · Run the Launcher (or the Design Kit) with hot reload
bun x moon run launcher:dev

# 3 · Portable zips → release/<app>/
bun run package`;

/** Download: platforms, suite vs single app, and building from source. */
export function DownloadPage() {
  const { href } = useRouter();
  const isClient = useIsClient();
  const guessed = isClient ? guessPlatform() : 'web';
  const current: Os | undefined = guessed === 'web' ? undefined : guessed;

  return (
    <>
      <div className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dots" />
        <div
          aria-hidden="true"
          className="aurora-blob-b absolute -top-40 left-1/2 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-[100px]"
          style={{ background: 'var(--site-glow-a)' }}
        />
        <div className="mx-auto max-w-site px-4 pt-16 pb-4 text-center sm:px-6 md:pt-24">
          <SectionHeading
            level={1}
            align="center"
            eyebrow="Download"
            title={
              <>
                Get GENSLATE for <span className="text-ink">every desktop.</span>
              </>
            }
            lead="Portable by default: unzip, run, and take it with you. No installer, no admin rights, no leftovers."
          />
        </div>
      </div>

      <Section className="pt-10 md:pt-12">
        <Banner tone="info" title="Preview" className="reveal mx-auto max-w-3xl">
          The first public release is being prepared. Builds will appear on GitHub Releases for each
          platform; until then you can build the Launcher and the Design Kit from source in a few
          minutes. Preview builds are not code-signed yet, so Windows SmartScreen and macOS
          Gatekeeper will ask you to confirm the first launch.
        </Banner>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PLATFORMS.map((platform, index) => {
            const detected = platform.id === current;
            return (
              <article
                key={platform.id}
                aria-labelledby={`platform-${platform.id}`}
                className={cn(
                  'reveal spotlight flex flex-col rounded-2xl border bg-surface-raised/60 p-6 shadow-card',
                  detected ? 'border-accent-border shadow-popover' : 'border-border-subtle',
                )}
                style={{ '--reveal-step': index } as CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-xl bg-accent-subtle text-accent-fg">
                    <Icon name={platform.icon} size={20} />
                  </span>
                  {detected ? (
                    <Badge tone="accent" dot>
                      Your system
                    </Badge>
                  ) : null}
                </div>
                <h2 id={`platform-${platform.id}`} className="mt-5 font-semibold text-2xl">
                  {platform.name}
                </h2>
                <ul className="mt-3 grid gap-1.5 text-fg-secondary text-md">
                  {platform.formats.map((format) => (
                    <li key={format} className="flex items-center gap-2">
                      <Icon name="codicon:package" size={14} className="text-fg-muted" />
                      {format}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex-1 text-fg-muted text-sm leading-relaxed">
                  {platform.requires}
                </p>
                <LinkButton
                  href={REPO_LINKS.releases}
                  external
                  variant={detected ? 'primary' : 'secondary'}
                  leadingIcon="codicon:cloud-download"
                  className="mt-6 w-full justify-center"
                >
                  GitHub Releases
                </LinkButton>
              </article>
            );
          })}
        </div>
      </Section>

      <Section labelledBy="packages-title" className="pt-0 md:pt-0">
        <SectionHeading
          id="packages-title"
          eyebrow="Two ways to run"
          title="The whole suite, or just one app."
          lead="Both are portable. Both keep everything in the folder you unzip."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {PACKAGES.map((item, index) => (
            <div
              key={item.title}
              className="reveal spotlight rounded-2xl border border-border-subtle bg-surface-raised/60 p-6 shadow-card"
              style={{ '--reveal-step': index } as CSSProperties}
            >
              <div className="flex items-center gap-3">
                <Icon name={item.icon} size={20} className="text-accent-fg" />
                <h3 className="font-semibold text-fg-strong text-xl">{item.title}</h3>
                <code className="ml-auto rounded-md bg-surface-sunken px-2 py-0.5 font-mono text-fg-muted text-xs">
                  {item.path}
                </code>
              </div>
              <p className="mt-3 text-fg-secondary text-md leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        labelledBy="source-title"
        className="grid items-start gap-12 pt-0 md:pt-0 lg:grid-cols-[1fr_1.3fr]"
      >
        <div>
          <SectionHeading
            id="source-title"
            eyebrow="Build from source"
            title="Three commands."
            lead="The toolchain is pinned in the repository: proto installs moon, Bun and Rust at exactly the right versions, and bun run setup does the rest."
          />
          <div className="reveal mt-8 flex flex-wrap gap-3">
            <LinkButton href={href('/docs/developers/getting-started/')} leadingIcon="codicon:book">
              Getting started
            </LinkButton>
            <LinkButton
              href={REPO_LINKS.home}
              external
              variant="ghost"
              leadingIcon="codicon:github"
            >
              Repository
            </LinkButton>
          </div>
        </div>
        <div className="reveal">
          <CodeBlock code={BUILD} language="bash" title="Terminal" />
        </div>
      </Section>
    </>
  );
}
