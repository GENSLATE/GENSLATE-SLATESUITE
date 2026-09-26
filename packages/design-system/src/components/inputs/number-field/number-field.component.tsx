import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import { field, fieldInput } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import { FieldFrame } from '../field/field-frame.component';
import type { NumberFieldProps } from './number-field.types';
import {
  numberFieldGroupVariants,
  numberFieldStepperVariants,
  numberFieldStepVariants,
} from './number-field.variants';

/**
 * Numeric input with a macOS-style stepper (stacked chevrons). Arrow keys step, Shift steps by
 * `largeStep`, and the value formats with `format` (Base UI `NumberField`).
 */
export function NumberField({
  label,
  description,
  error,
  invalid,
  size = 'md',
  placeholder,
  hideStepper = false,
  onValueChange,
  disabled,
  name,
  className,
  controlClassName,
  labels,
  ...rootProps
}: NumberFieldProps) {
  const isInvalid = invalid ?? error != null;
  return (
    <FieldFrame
      label={label}
      description={description}
      error={error}
      invalid={isInvalid}
      disabled={disabled}
      name={name}
      className={className}
    >
      <BaseNumberField.Root
        data-slot="number-field"
        disabled={disabled}
        onValueChange={(value) => onValueChange?.(value)}
        className="min-w-0"
        {...rootProps}
      >
        <BaseNumberField.Group
          data-slot="number-field-group"
          className={cn(field({ size }), numberFieldGroupVariants(), controlClassName)}
        >
          <BaseNumberField.Input
            data-slot="number-field-input"
            placeholder={placeholder}
            className={cn(fieldInput(), 'tabular-nums')}
          />
          {!hideStepper && (
            <span data-slot="number-field-stepper" className={numberFieldStepperVariants()}>
              <BaseNumberField.Increment
                data-slot="number-field-increment"
                aria-label={labels?.increment ?? 'Increase'}
                className={numberFieldStepVariants()}
              >
                <Icon name="codicon:chevron-up" size={12} />
              </BaseNumberField.Increment>
              <BaseNumberField.Decrement
                data-slot="number-field-decrement"
                aria-label={labels?.decrement ?? 'Decrease'}
                className={numberFieldStepVariants()}
              >
                <Icon name="codicon:chevron-down" size={12} />
              </BaseNumberField.Decrement>
            </span>
          )}
        </BaseNumberField.Group>
      </BaseNumberField.Root>
    </FieldFrame>
  );
}
