import type { Field as BaseField } from '@base-ui/react/field';
import type { ReactNode } from 'react';

export interface FieldProps extends Omit<BaseField.Root.Props, 'className'> {
  className?: string | undefined;
}

export interface FieldLabelProps extends Omit<BaseField.Label.Props, 'className'> {
  className?: string | undefined;
}

export interface FieldDescriptionProps extends Omit<BaseField.Description.Props, 'className'> {
  className?: string | undefined;
}

export interface FieldErrorProps extends Omit<BaseField.Error.Props, 'className'> {
  className?: string | undefined;
}

/** Label / description / error slots shared by every labelled input. */
export interface FieldSlotProps {
  /** Visible label, associated with the control. */
  label?: ReactNode | undefined;
  /** Helper text under the control (replaced by the error while invalid). */
  description?: ReactNode | undefined;
  /** Error message, shown while the control is invalid. */
  error?: ReactNode | undefined;
  /** Marks the control invalid (`aria-invalid`, danger border). Defaults to `Boolean(error)`. */
  invalid?: boolean | undefined;
}
