import { tv } from '../utils/cn.util';

/** Keyboard focus treatment; `inset` for edge-to-edge rows and tabs. */
export const focusRing = tv({
  base: 'focus-ring',
  variants: {
    inset: { true: 'focus-ring-inset' },
  },
});
