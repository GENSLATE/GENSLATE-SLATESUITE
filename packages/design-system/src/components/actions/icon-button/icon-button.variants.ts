import { tv } from '../../../utils/cn.util';

/** Square icon buttons (VS Code action bar): quiet at rest, a soft fill on hover. */
export const iconButtonVariants = tv({
  base: [
    'relative inline-flex shrink-0 cursor-default select-none items-center justify-center text-fg-secondary',
    'focus-ring transition-[background-color,color,opacity] duration-fast ease-standard',
    'not-data-disabled:hover:text-fg-strong',
    'data-disabled:cursor-not-allowed data-disabled:opacity-40',
  ],
  variants: {
    variant: {
      ghost:
        'bg-transparent not-data-disabled:hover:bg-fill-hover not-data-disabled:active:bg-fill-pressed',
      secondary: [
        'inset-ring inset-ring-border-subtle bg-control text-fg shadow-control',
        'not-data-disabled:hover:bg-control-hover not-data-disabled:active:bg-control-pressed',
      ],
      primary: [
        'bg-accent text-on-accent shadow-control',
        'not-data-disabled:hover:bg-accent-hover not-data-disabled:hover:text-on-accent not-data-disabled:active:bg-accent-active',
      ],
      danger: [
        'bg-transparent text-danger-fg',
        'not-data-disabled:hover:bg-danger-subtle not-data-disabled:hover:text-danger-fg not-data-disabled:active:bg-danger-subtle',
      ],
    },
    size: {
      xs: 'size-control-xs rounded-sm',
      sm: 'size-control-sm rounded-control',
      md: 'size-control-md rounded-control',
      lg: 'size-control-lg rounded-control',
    },
    toggled: {
      true: [
        'inset-ring inset-ring-accent-border bg-accent-subtle text-accent-fg',
        'not-data-disabled:hover:bg-accent-subtle not-data-disabled:hover:text-accent-fg not-data-disabled:active:bg-accent-subtle',
        'window-inactive:inset-ring-border window-inactive:bg-fill-selected-inactive window-inactive:text-fg',
      ],
    },
  },
  defaultVariants: { variant: 'ghost', size: 'md', toggled: false },
});
