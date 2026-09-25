import type { Radio as BaseRadio } from '@base-ui/react/radio';
import type { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import type { ReactNode } from 'react';

export interface RadioGroupProps<Value = string>
  extends Omit<BaseRadioGroup.Props<Value>, 'className' | 'onValueChange'> {
  onValueChange?: ((value: Value) => void) | undefined;
  label?: ReactNode | undefined;
  description?: ReactNode | undefined;
  orientation?: 'vertical' | 'horizontal' | undefined;
  className?: string | undefined;
}

export interface RadioProps<Value = string>
  extends Omit<BaseRadio.Root.Props<Value>, 'className' | 'children'> {
  label?: ReactNode | undefined;
  description?: ReactNode | undefined;
  /** Class on the outer label (or the dot when there is no label). */
  className?: string | undefined;
}
