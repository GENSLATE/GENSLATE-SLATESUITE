import { useEffect } from 'react';

const supportsScrollReveal = () =>
  typeof CSS !== 'undefined' &&
  CSS.supports('(animation-timeline: view()) and (animation-range: entry)');

/**
 * Page-level behaviour that plain HTML can't express, wired once per page with delegated
 * listeners (no per-element React state):
 * - `[data-play]` mockups get `data-inview` while visible, so their animations only run on screen;
 * - `.reveal` elements get the IntersectionObserver fallback where scroll timelines are missing;
 * - `.spotlight` cards track the pointer (`--mx` / `--my`) for their sheen;
 * - docs code frames copy their code.
 */
export function useSiteEffects(pageKey: string): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: each page renders new elements to observe, so this re-runs per page on purpose
  useEffect(() => {
    const root = document.documentElement;
    const cleanups: (() => void)[] = [];

    const play = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.toggleAttribute('data-inview', entry.isIntersecting);
        }
      },
      { rootMargin: '80px 0px' },
    );
    for (const element of document.querySelectorAll('[data-play]')) play.observe(element);
    cleanups.push(() => play.disconnect());

    if (!supportsScrollReveal()) {
      root.setAttribute('data-reveal-fallback', '');
      const reveal = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.setAttribute('data-revealed', '');
            reveal.unobserve(entry.target);
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );
      for (const element of document.querySelectorAll('.reveal:not([data-revealed])')) {
        reveal.observe(element);
      }
      cleanups.push(() => reveal.disconnect());
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [pageKey]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const card = (event.target as Element | null)?.closest?.('.spotlight');
      if (!(card instanceof HTMLElement)) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    };

    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest?.('[data-copy-code]');
      if (!(button instanceof HTMLElement)) return;
      const code = button.closest('.code-frame')?.querySelector('pre')?.textContent ?? '';
      navigator.clipboard.writeText(code).then(
        () => {
          button.setAttribute('data-copied', '');
          const label = button.querySelector('.code-frame-copy-text');
          if (label) label.textContent = 'Copied';
          window.setTimeout(() => {
            button.removeAttribute('data-copied');
            if (label) label.textContent = 'Copy';
          }, 1600);
        },
        // Clipboard access can be denied (permissions, insecure context): the code stays selectable.
        () => undefined,
      );
    };

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('click', onClick);
    };
  }, []);
}
