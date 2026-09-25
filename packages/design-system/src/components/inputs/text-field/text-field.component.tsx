import { Input } from '@base-ui/react/input';
import { type PointerEvent, useRef } from 'react';
import { field, fieldInput } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import { FieldFrame } from '../field/field-frame.component';
import type { TextFieldProps } from './text-field.types';
import { textFieldAdornmentVariants, textFieldClearVariants } from './text-field.variants';
import { useControllableState } from './use-controllable-state';

/**
 * Single-line text input with optional label, description, error, leading/trailing adornments
 * and a clear button. Built on Base UI `Field` + `Input`.
 */
export function TextField({
  label,
  description,
  error,
  invalid,
  size = 'md',
  leading,
  trailing,
  clearable = false,
  onClear,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  disabled,
  name,
  className,
  controlClassName,
  inputClassName,
  ref,
  labels,
  ...inputProps
}: TextFieldProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isInvalid = invalid ?? error != null;
  const showClear = clearable && value.length > 0 && !disabled && !inputProps.readOnly;

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  // Clicking the chrome around the input (padding, icons) focuses the input, like AppKit.
  const focusInput = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.target === event.currentTarget ||
      !(event.target as HTMLElement).closest('button,input')
    ) {
      event.preventDefault();
      inputRef.current?.focus();
    }
  };

  const clear = () => {
    setValue('');
    onClear?.();
    inputRef.current?.focus();
  };

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
      <div
        data-slot="text-field-control"
        data-size={size}
        data-invalid={isInvalid ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        className={cn(field({ size }), 'group/field', controlClassName)}
        onPointerDown={focusInput}
      >
        {leading != null && (
          <span data-slot="text-field-leading" className={textFieldAdornmentVariants()}>
            {leading}
          </span>
        )}
        <Input
          data-slot="text-field-input"
          ref={setRefs}
          value={value}
          onValueChange={(next) => setValue(next)}
          disabled={disabled}
          className={cn(fieldInput(), inputClassName)}
          {...inputProps}
        />
        {showClear && (
          <button
            type="button"
            data-slot="text-field-clear"
            aria-label={labels?.clear ?? 'Clear'}
            tabIndex={-1}
            className={textFieldClearVariants()}
            onClick={clear}
          >
            <Icon name="codicon:close" size={14} />
          </button>
        )}
        {trailing != null && (
          <span data-slot="text-field-trailing" className={textFieldAdornmentVariants()}>
            {trailing}
          </span>
        )}
      </div>
    </FieldFrame>
  );
}
