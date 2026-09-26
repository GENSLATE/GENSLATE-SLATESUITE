import { tv } from '../../../utils/cn.util';

/** Windows 11 caption buttons: 46px wide, full titlebar height, red close on hover. */
export const windowControlsVariants = tv({
  slots: {
    root: 'chrome flex h-full shrink-0 items-stretch',
    button: [
      'focus-ring-inset flex w-11.5 items-center justify-center text-titlebar-fg',
      'window-inactive:text-titlebar-fg-inactive transition-colors duration-fast ease-standard',
    ],
  },
  variants: {
    kind: {
      default: { button: 'hover:bg-fill-hover active:bg-fill-pressed' },
      close: {
        button: 'hover:bg-danger hover:text-on-danger active:bg-danger-hover active:text-on-danger',
      },
    },
  },
  defaultVariants: { kind: 'default' },
});
