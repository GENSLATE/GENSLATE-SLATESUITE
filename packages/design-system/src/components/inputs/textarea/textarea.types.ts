import type { ComponentProps, Ref } from 'react';
import type { FieldSlotProps } from '../field/field.types';

export type TextareaSize = 'sm' | 'md' | 'lg';

export interface TextareaProps
  extends FieldSlotProps,
    Omit<ComponentProps<'textarea'>, 'className' | 'value' | 'defaultValue' | 'ref' | 'size'> {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  /** Text size / padding scale (matches TextField). */
  size?: TextareaSize | undefined;
  /** Grow with the content between `minRows` and `maxRows`. */
  autoGrow?: boolean | undefined;
  /** Minimum visible rows (default 3). */
  minRows?: number | undefined;
  /** Maximum rows before scrolling when `autoGrow` (default 12). */
  maxRows?: number | undefined;
  /** Class on the outer field stack. */
  className?: string | undefined;
  /** Class on the `<textarea>`. */
  textareaClassName?: string | undefined;
  ref?: Ref<HTMLTextAreaElement> | undefined;
}
