import type { Input as BaseInput } from '@base-ui/react/input';
import type { ReactNode, Ref } from 'react';
import type { FieldSlotProps } from '../field/field.types';

export type TextFieldSize = 'sm' | 'md' | 'lg';

export interface TextFieldLabels {
  /** Accessible name of the clear button. */
  clear?: string | undefined;
}

export interface TextFieldProps
  extends FieldSlotProps,
    Omit<
      BaseInput.Props,
      'className' | 'size' | 'value' | 'defaultValue' | 'onValueChange' | 'ref'
    > {
  /** Controlled value. */
  value?: string | undefined;
  /** Initial value when uncontrolled. */
  defaultValue?: string | undefined;
  /** Called with the new string on every edit (and with `''` when cleared). */
  onValueChange?: ((value: string) => void) | undefined;
  /** Control height: sm 24, md 28 (default), lg 32. */
  size?: TextFieldSize | undefined;
  /** Leading adornment, typically `<Icon name="codicon:…" size={14} />`. */
  leading?: ReactNode | undefined;
  /** Trailing adornment (unit, hint, button). */
  trailing?: ReactNode | undefined;
  /** Shows a clear button while the field has a value. */
  clearable?: boolean | undefined;
  /** Called after the clear button empties the field. */
  onClear?: (() => void) | undefined;
  /** Class on the outer field stack. */
  className?: string | undefined;
  /** Class on the bordered control box. */
  controlClassName?: string | undefined;
  /** Class on the `<input>`. */
  inputClassName?: string | undefined;
  ref?: Ref<HTMLInputElement> | undefined;
  labels?: TextFieldLabels | undefined;
}
