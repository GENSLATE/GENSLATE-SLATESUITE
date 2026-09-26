import { tv } from '../utils/cn.util';

/**
 * Text-entry chrome shared by TextField, SearchField, Textarea, Select triggers and NumberField:
 * a flat field with a hairline border that turns Frost with a soft halo on focus.
 */
export const field = tv({
  base: [
    'flex w-full min-w-0 items-center gap-1.5 rounded-control border border-border bg-field text-fg',
    'shadow-inset transition-[border-color,box-shadow,background-color] duration-fast ease-standard',
    'hover:border-border-strong',
    'focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--gs-color-focus-halo)]',
    'has-[[aria-invalid=true]]:border-danger-border data-invalid:border-danger-border',
    'data-invalid:focus-within:shadow-[0_0_0_3px_var(--gs-color-danger-subtle)]',
    'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:border-border',
  ],
  variants: {
    size: {
      sm: 'h-control-sm px-2 text-sm',
      md: 'h-control-md px-2.5 text-base',
      lg: 'h-control-lg px-3 text-md',
    },
    multiline: {
      true: 'h-auto items-start py-1.5',
    },
  },
  defaultVariants: { size: 'md' },
});

/** The bare `<input>` inside a `field`. */
export const fieldInput = tv({
  base: [
    'h-full min-w-0 flex-1 bg-transparent text-inherit outline-none',
    'placeholder:text-fg-muted disabled:cursor-not-allowed',
  ],
});
