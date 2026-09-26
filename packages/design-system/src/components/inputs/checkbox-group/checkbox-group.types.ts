import type { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';
import type { ReactNode } from 'react';

export interface CheckboxGroupProps
  extends Omit<BaseCheckboxGroup.Props, 'className' | 'onValueChange'> {
  onValueChange?: ((value: string[]) => void) | undefined;
  /** Visible group label (becomes the group's accessible name). */
  label?: ReactNode | undefined;
  description?: ReactNode | undefined;
  orientation?: 'vertical' | 'horizontal' | undefined;
  className?: string | undefined;
}
