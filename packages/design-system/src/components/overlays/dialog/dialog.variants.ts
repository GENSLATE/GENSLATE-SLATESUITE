import { tv } from '../../../utils/cn.util';

/** Shared by Dialog, AlertDialog and CommandPalette. */
export const dialogVariants = tv({
  slots: {
    backdrop: [
      'fixed inset-0 z-scrim bg-scrim',
      'transition-opacity duration-base ease-standard data-ending-style:opacity-0 data-starting-style:opacity-0',
    ],
    viewport: 'fixed inset-0 z-dialog flex items-center justify-center overflow-y-auto p-6',
    popup: [
      'relative flex max-h-[calc(100dvh-3rem)] w-full flex-col p-5 outline-none',
      'origin-top rounded-dialog bg-surface-dialog text-fg shadow-dialog',
      'transition-[opacity,scale,translate] duration-moderate ease-enter',
      'data-starting-style:-translate-y-2 data-starting-style:scale-96 data-starting-style:opacity-0',
      'data-ending-style:scale-98 data-ending-style:opacity-0 data-ending-style:duration-fast data-ending-style:ease-exit',
      'data-nested-dialog-open:scale-98 data-nested-dialog-open:opacity-80',
    ],
    title: 'pr-6 font-semibold text-fg-strong text-md',
    description: 'mt-1.5 text-base text-fg-secondary',
    body: 'scrollbar-thin -mx-5 mt-4 min-h-0 flex-1 overflow-y-auto px-5',
    footer: 'mt-5 flex flex-wrap items-center justify-end gap-2',
    close: [
      'focus-ring absolute top-3 right-3 flex size-6 items-center justify-center rounded-sm text-fg-muted',
      'transition-colors duration-fast ease-standard hover:bg-fill-hover hover:text-fg active:bg-fill-pressed',
    ],
  },
  variants: {
    size: {
      sm: { popup: 'max-w-dialog-sm' },
      md: { popup: 'max-w-dialog-md' },
      lg: { popup: 'max-w-dialog-lg' },
    },
  },
  defaultVariants: { size: 'md' },
});

/** Footer push buttons (kept local so overlays don't depend on the actions package). */
export const dialogButtonVariants = tv({
  base: [
    'focus-ring inline-flex h-control-md min-w-20 cursor-default items-center justify-center gap-1.5 rounded-control px-3',
    'select-none whitespace-nowrap font-medium text-base',
    'transition-colors duration-fast ease-standard',
    'disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50',
  ],
  variants: {
    tone: {
      default:
        'bg-control text-fg shadow-control ring-[0.5px] ring-border hover:bg-control-hover active:bg-control-pressed',
      primary:
        'bg-accent text-on-accent shadow-control hover:bg-accent-hover active:bg-accent-active',
      danger: 'bg-danger text-on-danger shadow-control hover:bg-danger-hover active:bg-danger',
      plain: '',
    },
  },
  defaultVariants: { tone: 'default' },
});
