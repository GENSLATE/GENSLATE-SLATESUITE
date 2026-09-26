import { useMediaQuery } from './use-media-query.hook';

/** True when the user asked the OS to reduce motion. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
