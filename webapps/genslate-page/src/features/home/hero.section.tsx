import { Badge, Icon } from '@genslate/design-system';
import type { CSSProperties, ReactNode } from 'react';

import { useRouter } from '../../app/router/router.context';
import { AppIcon } from '../../components/app-icon.component';
import { LinkButton } from '../../components/link-button.component';
import { APPS } from '../../content/apps.content';
import { ExplorerMockup } from '../mockups/explorer.mockup';
import { LauncherMockup } from '../mockups/launcher.mockup';
import { MockStage } from '../mockups/mock-stage.component';
import { TerminalMockup } from '../mockups/terminal.mockup';

const step = (n: number) => ({ '--intro-step': n }) as CSSProperties;

/** Slow-drifting Frost and Aurora light over a fading dot grid. */
function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-dots" />
      <div
        className="aurora-blob-a absolute -top-[18%] left-[8%] h-[70%] w-[46%] rounded-full blur-[90px]"
        style={{ background: 'var(--site-glow-a)' }}
      />
      <div
        className="aurora-blob-b absolute top-[4%] right-[4%] h-[62%] w-[42%] rounded-full blur-[100px]"
        style={{ background: 'var(--site-glow-b)' }}
      />
      <div
        className="aurora-blob-a absolute top-[38%] left-[34%] h-[48%] w-[36%] rounded-full blur-[110px]"
        style={{ background: 'var(--site-glow-c)', animationDelay: '-9s' }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-canvas" />
    </div>
  );
}

/** A window drawn at its natural size, then scaled into place inside the scene. */
function Placed({
  x,
  y,
  scale,
  width,
  height,
  children,
  className,
}: {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly width: number;
  readonly height: number;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        scale,
        transformOrigin: '0 0',
      }}
    >
      {children}
    </div>
  );
}

/** The GENSLATE desktop: Explorer and Terminal behind, the Launcher open in front. */
function HeroScene() {
  return (
    <MockStage
      width={1280}
      height={760}
      label="A desktop running GENSLATE Explorer and Terminal, with the Launcher open showing favourite apps"
    >
      <div
        className="relative size-full overflow-hidden rounded-[18px] shadow-dialog"
        style={{ background: 'var(--site-wallpaper)' }}
      >
        <Placed x={40} y={40} scale={0.66} width={1120} height={700} className="opacity-95">
          <ExplorerMockup />
        </Placed>
        <Placed x={330} y={270} scale={0.6} width={1120} height={700}>
          <TerminalMockup />
        </Placed>
        <Placed x={840} y={48} scale={0.94} width={460} height={700}>
          <LauncherMockup />
        </Placed>
      </div>
    </MockStage>
  );
}

/** The macOS dock: every app, magnified under the pointer. */
function Dock() {
  const { href } = useRouter();
  return (
    // `overflow-x-auto` turns `overflow-y` into `auto` too, so the dock clips anything above its
    // box: the top padding leaves room for a magnified icon's label, and the negative margin
    // keeps the dock where it was. The padding is see-through to the pointer.
    <nav
      aria-label="Apps"
      className="pointer-events-none relative z-10 mx-auto -mt-24 w-fit max-w-[calc(100vw-2rem)] overflow-x-auto px-4 pt-20 pb-2 [scrollbar-width:none] md:-mt-30"
    >
      <ul className="surface-glass pointer-events-auto flex items-end gap-1.5 rounded-[22px] border border-border-subtle px-3 pt-2.5 pb-2.5 shadow-dialog">
        {APPS.map((app) => (
          <li key={app.id} className="dock-item relative">
            <a
              href={href(`/apps/${app.id}/`)}
              className="focus-ring block rounded-xl"
              aria-label={app.name}
            >
              <AppIcon app={app} size={48} frame="full" className="drop-shadow-sm" />
              <span className="dock-label pointer-events-none absolute -top-9 left-1/2 whitespace-nowrap rounded-md border border-tooltip-border bg-tooltip-bg px-2 py-1 font-medium text-tooltip-fg text-xs shadow-popover">
                {app.name}
              </span>
            </a>
            {app.status === 'preview' ? (
              <span className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-fg-muted" />
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function HeroSection() {
  const { href } = useRouter();
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-x-clip pb-8">
      <HeroBackdrop />
      <div className="mx-auto max-w-site px-4 pt-16 text-center sm:px-6 md:pt-24">
        <a
          href={href('/apps/launcher/')}
          className="intro group focus-ring inline-flex items-center gap-2.5 rounded-full border border-border-subtle bg-surface-raised/70 py-1 pr-3 pl-1 text-fg-secondary text-sm shadow-card backdrop-blur hover:text-fg-strong hover:no-underline"
          style={step(0)}
        >
          <Badge tone="accent" variant="solid" size="sm" pill>
            New
          </Badge>
          The Launcher preview is here
          <Icon
            name="codicon:arrow-right"
            size={14}
            className="transition-transform duration-fast group-hover:translate-x-0.5"
          />
        </a>

        <h1
          id="hero-title"
          className="intro mx-auto mt-7 max-w-4xl font-semibold text-hero"
          style={step(1)}
        >
          Beautiful apps
          <br />
          that <span className="text-ink">travel with you.</span>
        </h1>

        <p className="intro mx-auto mt-6 max-w-2xl text-fg-secondary text-lead" style={step(2)}>
          GENSLATE is a suite of fast, private desktop apps — a launcher, terminal, file explorer,
          editor and more — that run from any folder or USB drive on Windows, macOS and Linux.
          Designed in official Nord.
        </p>

        <div
          className="intro mt-9 flex flex-wrap items-center justify-center gap-3"
          style={step(3)}
        >
          <LinkButton
            href={href('/download/')}
            variant="primary"
            leadingIcon="codicon:cloud-download"
          >
            Download GENSLATE
          </LinkButton>
          <LinkButton href={href('/apps/')} trailingIcon="codicon:arrow-right">
            Explore the apps
          </LinkButton>
        </div>

        <p
          className="intro mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-fg-muted text-sm"
          style={step(4)}
        >
          <span className="flex items-center gap-1.5">
            <Icon name="codicon:package" size={14} /> Portable, no installer
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="codicon:shield" size={14} /> No accounts, no analytics
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="codicon:vm" size={14} /> Windows · macOS · Linux
          </span>
        </p>
      </div>

      <div
        className="intro relative mx-auto mt-14 max-w-[1180px] px-4 [perspective:2000px] sm:px-6"
        style={step(5)}
      >
        <div
          className="absolute inset-x-[10%] top-[10%] bottom-0 -z-10 bg-app-glow blur-3xl"
          data-nord="nord9"
        />
        <div className="hero-tilt origin-[50%_0%]">
          <HeroScene />
        </div>
      </div>
      <Dock />
    </section>
  );
}
