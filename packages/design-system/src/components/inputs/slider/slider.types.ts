import type { Slider as BaseSlider } from '@base-ui/react/slider';
import type { ReactNode } from 'react';

export interface SliderProps<Value extends number | readonly number[] = number>
  extends Omit<
    BaseSlider.Root.Props<Value>,
    'className' | 'children' | 'onValueChange' | 'onValueCommitted'
  > {
  onValueChange?: ((value: Value extends number ? number : Value) => void) | undefined;
  onValueCommitted?: ((value: Value extends number ? number : Value) => void) | undefined;
  /** Visible label above the track. */
  label?: ReactNode | undefined;
  /** Show the formatted value at the trailing end of the label row. */
  showValue?: boolean | undefined;
  /** Tick marks: `true` for every `step`, or explicit values. */
  ticks?: boolean | readonly number[] | undefined;
  /** Accessible names per thumb when there is no visible label (e.g. range sliders). */
  getAriaLabel?: ((index: number) => string) | undefined;
  className?: string | undefined;
}
