import type { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import type { FieldSlotProps } from '../field/field.types';

export type NumberFieldSize = 'sm' | 'md' | 'lg';

export interface NumberFieldLabels {
  increment?: string | undefined;
  decrement?: string | undefined;
}

export interface NumberFieldProps
  extends FieldSlotProps,
    Omit<BaseNumberField.Root.Props, 'className' | 'onValueChange' | 'render' | 'style'> {
  /** Called with the parsed number (or `null` when empty). */
  onValueChange?: ((value: number | null) => void) | undefined;
  size?: NumberFieldSize | undefined;
  placeholder?: string | undefined;
  /** Hide the stepper chevrons. */
  hideStepper?: boolean | undefined;
  /** Class on the outer field stack. */
  className?: string | undefined;
  /** Class on the bordered group. */
  controlClassName?: string | undefined;
  labels?: NumberFieldLabels | undefined;
}
