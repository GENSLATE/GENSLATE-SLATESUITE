import type { Switch as BaseSwitch } from '@base-ui/react/switch';
import type { ReactNode } from 'react';

export type SwitchSize = 'sm' | 'md';

export interface SwitchProps
  extends Omit<BaseSwitch.Root.Props, 'className' | 'onCheckedChange' | 'children'> {
  onCheckedChange?: ((checked: boolean) => void) | undefined;
  /** Label text; rendered before the switch (macOS settings style) unless `labelPosition="end"`. */
  label?: ReactNode | undefined;
  description?: ReactNode | undefined;
  labelPosition?: 'start' | 'end' | undefined;
  size?: SwitchSize | undefined;
  /** Class on the outer label (or the switch when there is no label). */
  className?: string | undefined;
}
