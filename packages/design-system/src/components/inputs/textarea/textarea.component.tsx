import { Field as BaseField } from '@base-ui/react/field';
import { useLayoutEffect, useRef } from 'react';
import { field } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { FieldFrame } from '../field/field-frame.component';
import { useControllableState } from '../text-field/use-controllable-state';
import type { TextareaProps } from './textarea.types';
import { textareaVariants } from './textarea.variants';

/** Multi-line text input with the field chrome; optionally grows with its content. */
export function Textarea({
  label,
  description,
  error,
  invalid,
  size = 'md',
  autoGrow = false,
  minRows = 3,
  maxRows = 12,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  disabled,
  name,
  className,
  textareaClassName,
  ref,
  ...textareaProps
}: TextareaProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange);
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const isInvalid = invalid ?? error != null;

  // Auto-grow: measure once per value change; clamp to maxRows.
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!autoGrow || !el) return;
    void value;
    const style = getComputedStyle(el);
    const lineHeight = Number.parseFloat(style.lineHeight) || 18;
    const chrome =
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom) +
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth);
    el.style.height = 'auto';
    const max = lineHeight * maxRows + chrome;
    const border =
      Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth);
    el.style.height = `${Math.min(el.scrollHeight + border, max)}px`;
  }, [autoGrow, maxRows, value]);

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
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
      <BaseField.Control
        data-slot="textarea"
        value={value}
        onValueChange={(next) => setValue(next)}
        disabled={disabled}
        className={cn(
          field({ size, multiline: true }),
          textareaVariants({ size, autoGrow }),
          textareaClassName,
        )}
        render={<textarea ref={setRefs} rows={minRows} {...textareaProps} />}
      />
    </FieldFrame>
  );
}
