import { tv } from '../../../utils/cn.util';

/**
 * macOS push buttons at VS Code density. `secondary` is the default: control fill, hairline
 * edge and a 1px drop. Colour-only transitions; pressed state darkens instantly like AppKit.
 */
export const buttonVariants = tv({
  slots: {
    root: [
      'group/button relative inline-flex shrink-0 cursor-default select-none items-center justify-center whitespace-nowrap font-medium',
      'focus-ring transition-[background-color,color,box-shadow,opacity] duration-fast ease-standard',
      'data-disabled:cursor-not-allowed data-disabled:opacity-45',
    ],
    content: 'inline-flex min-w-0 items-center justify-center gap-[inherit]',
    spinner: 'absolute inset-0 m-auto',
  },
  variants: {
    variant: {
      primary: {
        root: [
          'bg-accent text-on-accent shadow-control',
          'not-data-disabled:hover:bg-accent-hover not-data-disabled:active:bg-accent-active',
          'window-inactive:inset-ring window-inactive:inset-ring-border-subtle window-inactive:bg-control window-inactive:text-fg',
        ],
      },
      secondary: {
        root: [
          'inset-ring inset-ring-border-subtle bg-control text-fg shadow-control',
          'not-data-disabled:hover:bg-control-hover not-data-disabled:active:bg-control-pressed',
        ],
      },
      ghost: {
        root: [
          'bg-transparent text-fg',
          'not-data-disabled:hover:bg-fill-hover not-data-disabled:active:bg-fill-pressed',
        ],
      },
      danger: {
        root: [
          'bg-danger text-on-danger shadow-control',
          'not-data-disabled:hover:bg-danger-hover not-data-disabled:active:brightness-90',
        ],
      },
      link: {
        root: [
          'h-auto! bg-transparent px-0! font-normal text-accent-fg',
          'not-data-disabled:hover:underline not-data-disabled:hover:underline-offset-2',
        ],
      },
    },
    size: {
      xs: { root: 'h-control-xs gap-1 rounded-sm px-1.5 text-xs' },
      sm: { root: 'h-control-sm gap-1 rounded-control px-2 text-sm' },
      md: { root: 'h-control-md gap-1.5 rounded-control px-3 text-base' },
      lg: { root: 'h-control-lg gap-2 rounded-control px-4 text-md' },
    },
    fullWidth: {
      true: { root: 'w-full' },
    },
    loading: {
      true: { root: 'cursor-progress', content: 'invisible' },
    },
    iconOnly: {
      true: {},
    },
  },
  compoundVariants: [
    { size: 'xs', iconOnly: true, class: { root: 'w-control-xs px-0' } },
    { size: 'sm', iconOnly: true, class: { root: 'w-control-sm px-0' } },
    { size: 'md', iconOnly: true, class: { root: 'w-control-md px-0' } },
    { size: 'lg', iconOnly: true, class: { root: 'w-control-lg px-0' } },
  ],
  defaultVariants: {
    variant: 'secondary',
    size: 'md',
    fullWidth: false,
    loading: false,
    iconOnly: false,
  },
});
