import { Field as BaseField } from '@base-ui/react/field';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type {
  FieldDescriptionProps,
  FieldErrorProps,
  FieldLabelProps,
  FieldProps,
} from './field.types';
import {
  fieldDescriptionVariants,
  fieldErrorVariants,
  fieldLabelVariants,
  fieldRootVariants,
} from './field.variants';

/** Groups a label, a control, a description and an error (Base UI `Field.Root`). */
export function Field({ className, ...props }: FieldProps) {
  return (
    <BaseField.Root data-slot="field" className={cn(fieldRootVariants(), className)} {...props} />
  );
}

export function FieldLabel({ className, ...props }: FieldLabelProps) {
  return (
    <BaseField.Label
      data-slot="field-label"
      className={cn(fieldLabelVariants(), className)}
      {...props}
    />
  );
}

export function FieldDescription({ className, ...props }: FieldDescriptionProps) {
  return (
    <BaseField.Description
      data-slot="field-description"
      className={cn(fieldDescriptionVariants(), className)}
      {...props}
    />
  );
}

/** Error message with a leading error glyph. Pass `match` to tie it to a validity state. */
export function FieldError({ className, children, ...props }: FieldErrorProps) {
  return (
    <BaseField.Error
      data-slot="field-error"
      className={cn(fieldErrorVariants(), className)}
      {...props}
    >
      <Icon name="codicon:error" size={14} className="mt-px" />
      <span>{children}</span>
    </BaseField.Error>
  );
}
