import { tv } from '../../../utils/cn.util';

export const badgeVariants = tv({
  slots: {
    root: 'inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap align-middle font-medium tabular-nums',
    dot: 'size-1.5 shrink-0 rounded-full bg-current',
  },
  variants: {
    tone: {
      neutral: {},
      accent: {},
      success: {},
      warning: {},
      danger: {},
      info: {},
    },
    variant: {
      subtle: {},
      solid: {},
      outline: { root: 'inset-ring bg-transparent' },
    },
    size: {
      sm: { root: 'h-4 rounded-xs px-1 text-2xs' },
      md: { root: 'h-5 rounded-sm px-1.5 text-xs' },
    },
    pill: {
      true: { root: 'rounded-full' },
    },
  },
  compoundVariants: [
    { variant: 'subtle', tone: 'neutral', class: { root: 'bg-fill-pressed text-fg-secondary' } },
    { variant: 'subtle', tone: 'accent', class: { root: 'bg-accent-subtle text-accent-fg' } },
    { variant: 'subtle', tone: 'success', class: { root: 'bg-success-subtle text-success-fg' } },
    { variant: 'subtle', tone: 'warning', class: { root: 'bg-warning-subtle text-warning-fg' } },
    { variant: 'subtle', tone: 'danger', class: { root: 'bg-danger-subtle text-danger-fg' } },
    { variant: 'subtle', tone: 'info', class: { root: 'bg-info-subtle text-info-fg' } },
    { variant: 'solid', tone: 'neutral', class: { root: 'bg-fg-muted text-canvas' } },
    { variant: 'solid', tone: 'accent', class: { root: 'bg-accent text-on-accent' } },
    { variant: 'solid', tone: 'success', class: { root: 'bg-success text-on-success' } },
    { variant: 'solid', tone: 'warning', class: { root: 'bg-warning text-on-warning' } },
    { variant: 'solid', tone: 'danger', class: { root: 'bg-danger text-on-danger' } },
    { variant: 'solid', tone: 'info', class: { root: 'bg-info text-on-info' } },
    { variant: 'outline', tone: 'neutral', class: { root: 'inset-ring-border text-fg-secondary' } },
    {
      variant: 'outline',
      tone: 'accent',
      class: { root: 'inset-ring-accent-border text-accent-fg' },
    },
    {
      variant: 'outline',
      tone: 'success',
      class: { root: 'inset-ring-success-border text-success-fg' },
    },
    {
      variant: 'outline',
      tone: 'warning',
      class: { root: 'inset-ring-warning-border text-warning-fg' },
    },
    {
      variant: 'outline',
      tone: 'danger',
      class: { root: 'inset-ring-danger-border text-danger-fg' },
    },
    { variant: 'outline', tone: 'info', class: { root: 'inset-ring-info-border text-info-fg' } },
    { pill: true, size: 'sm', class: { root: 'min-w-4 justify-center px-1' } },
    { pill: true, size: 'md', class: { root: 'min-w-5 justify-center px-1.5' } },
  ],
  defaultVariants: { tone: 'neutral', variant: 'subtle', size: 'md', pill: false },
});
