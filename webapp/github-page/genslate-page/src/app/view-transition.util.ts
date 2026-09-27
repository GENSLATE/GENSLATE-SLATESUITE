/**
 * View transitions for page navigations and theme switches.
 *
 * The kind of transition is exposed as `html[data-vt="forward|backward|theme"]` for the
 * duration of the transition, which site.motion.css keys its animations on. Browsers without the
 * API (or users who prefer reduced motion) get the update immediately.
 */
export type TransitionKind = 'forward' | 'backward' | 'theme';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function runViewTransition(kind: TransitionKind, update: () => void): void {
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset['vt'] = kind;
  const transition = document.startViewTransition(update);
  transition.finished.finally(() => {
    if (root.dataset['vt'] === kind) delete root.dataset['vt'];
  });
}
