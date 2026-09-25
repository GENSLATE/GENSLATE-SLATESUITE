import type { Toggle } from '@base-ui/react/toggle';
import type { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import type { IconSlot } from '../../display/icon/icon.slot';
import type { ButtonSize } from '../button/button.types';

export interface ToggleButtonProps<Value extends string = string>
  extends Omit<Toggle.Props<Value>, 'className'> {
  /** Icon: with no children it becomes an icon-only toggle and `label` is required. */
  icon?: IconSlot | undefined;
  /** Accessible name for icon-only toggles; also the native tooltip. */
  label?: string | undefined;
  /** @default 'ghost' */
  variant?: 'ghost' | 'secondary' | undefined;
  /** @default 'md' */
  size?: ButtonSize | undefined;
  className?: string | undefined;
}

export interface ToggleGroupProps<Value extends string = string>
  extends Omit<BaseToggleGroup.Props<Value>, 'className'> {
  className?: string | undefined;
}
