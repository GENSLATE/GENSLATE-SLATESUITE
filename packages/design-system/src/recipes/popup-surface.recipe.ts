import { tv } from '../utils/cn.util';

/**
 * Floating surfaces (menus, popovers, selects, tooltips' bigger siblings): the macOS recipe —
 * hairline ring + soft layered shadow + optional glass — entering with opacity, scale .96 and a
 * 4px rise from the Base UI `--transform-origin`, exiting faster.
 */
export const popupSurface = tv({
  base: [
    'relative z-popover origin-(--transform-origin) text-fg outline-none',
    'bg-surface-popover shadow-popover',
    'transition-[opacity,scale,translate] duration-base ease-enter',
    'data-starting-style:scale-96 data-starting-style:opacity-0',
    'data-ending-style:scale-96 data-ending-style:opacity-0 data-ending-style:duration-fast data-ending-style:ease-exit',
    'data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=top]:data-starting-style:translate-y-1',
    'data-[side=left]:data-starting-style:translate-x-1 data-[side=right]:data-starting-style:-translate-x-1',
  ],
  variants: {
    size: {
      menu: 'min-w-44 rounded-popover p-1',
      popover: 'rounded-popover p-3',
      dialog: 'rounded-dialog shadow-dialog',
    },
    glass: {
      true: 'surface-glass',
    },
  },
  defaultVariants: { size: 'menu', glass: false },
});
