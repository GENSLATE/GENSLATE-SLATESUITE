import type { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import type { ReactNode } from 'react';

export interface CheckboxProps
  extends Omit<BaseCheckbox.Root.Props, 'className' | 'onCheckedChange' | 'children'> {
  /** Called with the new checked state. */
  onCheckedChange?: ((checked: boolean) => void) | undefined;
  /** Label rendered to the right; clicking it toggles the box. */
  label?: ReactNode | undefined;
  /** Secondary line under the label. */
  description?: ReactNode | undefined;
  /** Danger border (e.g. an unaccepted required term). */
  invalid?: boolean | undefined;
  /** Class on the outer label (or the box when there is no label). */
  className?: string | undefined;
}
