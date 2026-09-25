import { tv } from '../../../utils/cn.util';

/**
 * macOS window buttons: 12px lights, 8px apart, a 0.5px rim, glyphs revealed when the pointer
 * is over the group (or a light has keyboard focus). Background windows show grey lights until hovered.
 */
export const trafficLightsVariants = tv({
  slots: {
    root: 'group/traffic chrome flex shrink-0 items-center gap-traffic-gap',
    light: [
      'relative flex size-traffic-light shrink-0 items-center justify-center rounded-full p-0',
      'focus-ring inset-ring-[0.5px] inset-ring-traffic-rim outline-offset-1',
      // Background window (prop or <html data-window-focused="false">), unless the group is hovered.
      '[[data-inactive]:not(:hover)>&]:bg-traffic-inactive',
      '[[data-window-focused=false]_[data-slot=traffic-lights]:not(:hover)>&]:bg-traffic-inactive',
      'disabled:bg-traffic-inactive! disabled:opacity-60',
    ],
    glyph: [
      'size-traffic-light text-traffic-glyph opacity-0',
      'group-hover/traffic:opacity-100 group-has-focus-visible/traffic:opacity-100',
      '[:disabled>&]:invisible',
    ],
  },
  variants: {
    kind: {
      close: { light: 'bg-traffic-close active:bg-traffic-close-pressed' },
      minimize: { light: 'bg-traffic-minimize active:bg-traffic-minimize-pressed' },
      maximize: { light: 'bg-traffic-maximize active:bg-traffic-maximize-pressed' },
    },
  },
});
