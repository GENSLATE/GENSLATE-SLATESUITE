import { tv } from '../../../utils/cn.util';

/**
 * macOS segmented control: a recessed track and one raised thumb that slides between equal
 * segments on the spring curve (transform only).
 */
export const segmentedControlVariants = tv({
  slots: {
    root: [
      'relative isolate inline-grid auto-cols-fr grid-flow-col items-stretch rounded-control bg-fill-pressed p-0.5',
      'data-disabled:opacity-45',
    ],
    thumb: [
      'pointer-events-none absolute inset-y-0.5 left-0.5 -z-10 w-[calc((100%-4px)/var(--segment-count))] rounded-[5px]',
      'inset-ring inset-ring-border-subtle translate-x-[calc(var(--segment-index)*100%)] bg-control shadow-control',
      'transition-transform duration-moderate ease-spring motion-reduce:transition-none',
    ],
    item: [
      'relative inline-flex min-w-0 cursor-default select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] px-3 font-medium text-fg-secondary',
      'focus-ring-inset transition-colors duration-fast ease-standard',
      'not-data-disabled:hover:text-fg-strong data-pressed:text-fg-strong',
      'data-disabled:cursor-not-allowed data-disabled:text-fg-disabled',
    ],
  },
  variants: {
    size: {
      sm: { root: 'h-control-sm', item: 'px-2 text-sm' },
      md: { root: 'h-control-md', item: 'text-base' },
      lg: { root: 'h-control-lg', item: 'px-4 text-md' },
    },
    fullWidth: {
      true: { root: 'grid w-full' },
    },
  },
  defaultVariants: { size: 'md', fullWidth: false },
});
