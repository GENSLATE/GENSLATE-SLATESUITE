import { tv } from '../../../utils/cn.util';

export const avatarVariants = tv({
  slots: {
    root: 'relative inline-flex shrink-0 select-none items-center justify-center align-middle',
    clip: 'inset-ring inset-ring-border-subtle flex size-full items-center justify-center overflow-hidden bg-accent-subtle text-accent-fg',
    image: 'size-full object-cover',
    fallback: 'flex size-full items-center justify-center font-semibold uppercase',
    status: 'absolute right-0 bottom-0 rounded-full ring-2 ring-canvas',
  },
  variants: {
    size: {
      xs: { root: 'size-4', fallback: 'text-[8px]', status: 'size-1.5 ring-1' },
      sm: { root: 'size-5', fallback: 'text-[9px]', status: 'size-1.5 ring-1' },
      md: { root: 'size-6', fallback: 'text-2xs', status: 'size-2' },
      lg: { root: 'size-8', fallback: 'text-xs', status: 'size-2.5' },
      xl: { root: 'size-10', fallback: 'text-sm', status: 'size-3' },
    },
    shape: {
      circle: { clip: 'rounded-full' },
      square: { clip: 'rounded-sm' },
    },
    status: {
      online: { status: 'bg-success' },
      away: { status: 'bg-warning' },
      busy: { status: 'bg-danger' },
      offline: { status: 'bg-fg-disabled' },
    },
  },
  defaultVariants: { size: 'md', shape: 'circle' },
});
