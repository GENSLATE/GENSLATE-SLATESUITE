import { tv } from '../../../utils/cn.util';

// Stacking maths adapted from the Base UI Toast example: collapsed toasts peek behind the front
// one (scaled down), and spread out while hovered / focused (`data-expanded`).
const stack = [
  '[--gap:0.5rem] [--peek:0.5rem] [--scale:calc(max(0,1-(var(--toast-index)*0.05)))] [--shrink:calc(1-var(--scale))]',
  '[--height:var(--toast-frontmost-height,var(--toast-height))]',
  '[--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]',
  'absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] h-(--height) w-full origin-bottom',
  '[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]',
  'data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]',
  'data-starting-style:[transform:translateY(150%)] data-limited:opacity-0 data-ending-style:opacity-0',
  '[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]',
  'data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]',
  'data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
  'after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[""]',
  '[transition:transform_var(--gs-duration-slow)_var(--gs-ease-enter),opacity_var(--gs-duration-slow),height_var(--gs-duration-fast)]',
];

export const toastVariants = tv({
  slots: {
    viewport:
      'fixed right-3 bottom-[calc(var(--gs-size-statusbar)+0.75rem)] z-toast w-90 max-w-[calc(100vw-1.5rem)] outline-none',
    root: [...stack, 'select-none rounded-popover bg-surface-popover text-fg shadow-popover'],
    content: [
      'flex items-start gap-2.5 overflow-hidden p-3 pr-2',
      'transition-opacity duration-base ease-standard data-behind:opacity-0 data-expanded:opacity-100',
    ],
    icon: 'mt-px shrink-0',
    text: 'flex min-w-0 flex-1 flex-col gap-0.5',
    title: 'font-semibold text-base text-fg-strong',
    description: 'text-fg-secondary text-sm',
    action: [
      'focus-ring mt-1.5 w-fit rounded-sm font-medium text-accent-fg text-sm outline-none',
      'hover:underline hover:underline-offset-2',
    ],
    close: [
      'focus-ring -mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm text-fg-muted outline-none',
      'transition-colors duration-fast ease-standard hover:bg-fill-hover hover:text-fg active:bg-fill-pressed',
    ],
  },
  variants: {
    type: {
      info: { icon: 'text-info-fg' },
      success: { icon: 'text-success-fg' },
      warning: { icon: 'text-warning-fg' },
      error: { icon: 'text-danger-fg' },
      none: { icon: 'text-fg-muted' },
    },
  },
  defaultVariants: { type: 'none' },
});
