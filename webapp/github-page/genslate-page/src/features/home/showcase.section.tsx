import { IconButton } from '@genslate/design-system';
import { useRef } from 'react';

import { useRouter } from '../../app/router/router.context';
import { AppIcon } from '../../components/app-icon.component';
import { SectionHeading } from '../../components/section.component';
import { findApp } from '../../content/apps.content';
import { AppMockup } from '../mockups/mockups.registry';

const SHOWCASE = [
  'terminal',
  'explorer',
  'coder',
  'editor',
  'jukebox',
  'gallery',
  'browser',
  'aistudio',
] as const;

/**
 * A scroll-snapping filmstrip of app windows. Slides scale and fade as they enter and leave the
 * strip (a scroll-driven `view(inline)` timeline); the arrow buttons page through it.
 */
export function ShowcaseSection() {
  const { href } = useRouter();
  const strip = useRef<HTMLUListElement>(null);

  const page = (direction: 1 | -1) => {
    const element = strip.current;
    if (!element) return;
    const slide = element.querySelector('li');
    const distance = (slide?.getBoundingClientRect().width ?? element.clientWidth) + 24;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollBy({ left: direction * distance, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <section aria-labelledby="showcase-title" className="py-20 md:py-28">
      <div className="mx-auto flex max-w-site flex-wrap items-end justify-between gap-6 px-4 sm:px-6">
        <SectionHeading
          id="showcase-title"
          eyebrow="Designed as one family"
          title="Every window feels like home."
          lead="The same titlebar, sidebar, status bar and keyboard model in every app — so the second one you open already feels familiar. These are live previews built from the GENSLATE design kit."
        />
        <div className="reveal flex gap-2">
          <IconButton
            label="Previous app"
            icon="codicon:arrow-left"
            variant="secondary"
            size="lg"
            onClick={() => page(-1)}
          />
          <IconButton
            label="Next app"
            icon="codicon:arrow-right"
            variant="secondary"
            size="lg"
            onClick={() => page(1)}
          />
        </div>
      </div>

      <ul
        ref={strip}
        aria-label="App previews"
        className="showcase-strip mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-[max(1rem,calc((100vw_-_76rem)/2_+_1.5rem))] pb-6 [scrollbar-width:none]"
      >
        {SHOWCASE.map((id) => {
          const app = findApp(id);
          if (!app) return null;
          return (
            <li key={id} className="showcase-slide w-[min(86vw,860px)] shrink-0 snap-center">
              <AppMockup id={id} />
              <a
                href={href(`/apps/${id}/`)}
                className="group focus-ring mt-5 flex items-center gap-3 rounded-lg p-1 hover:no-underline"
              >
                <AppIcon app={app} size={32} />
                <span>
                  <span className="block font-semibold text-fg-strong text-md group-hover:text-accent-fg">
                    {app.name}
                  </span>
                  <span className="block text-fg-muted text-sm">{app.tagline}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
