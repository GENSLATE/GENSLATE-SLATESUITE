import type { Toggle } from '@base-ui/react/toggle';
import type { ReactNode } from 'react';
import type { IconSlot } from '../../display/icon/icon.slot';

export type SegmentedControlSize = 'sm' | 'md' | 'lg';

export interface SegmentedControlProps<Value extends string = string> {
  /** The selected segment (controlled). */
  value?: Value | undefined;
  /** The initially selected segment. @default the first item */
  defaultValue?: Value | undefined;
  onValueChange?: ((value: Value) => void) | undefined;
  /** @default 'md' */
  size?: SegmentedControlSize | undefined;
  /** Stretch to the container width (segments share it equally either way). */
  fullWidth?: boolean | undefined;
  disabled?: boolean | undefined;
  /** Accessible name of the group. */
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  className?: string | undefined;
  /** `SegmentedControlItem`s. */
  children: ReactNode;
}

export interface SegmentedControlItemProps<Value extends string = string>
  extends Omit<
    Toggle.Props<Value>,
    'className' | 'value' | 'pressed' | 'defaultPressed' | 'onPressedChange'
  > {
  value: Value;
  icon?: IconSlot | undefined;
  /** Accessible name for icon-only segments; also the native tooltip. */
  label?: string | undefined;
  className?: string | undefined;
}
