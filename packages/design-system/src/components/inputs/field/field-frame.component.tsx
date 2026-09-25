import type { ReactNode } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from './field.component';
import type { FieldSlotProps } from './field.types';

export interface FieldFrameProps extends FieldSlotProps {
  disabled?: boolean | undefined;
  name?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/**
 * Internal: wraps a control in a Base UI `Field` with the standard label → control →
 * description/error stack, so every labelled input lays out identically.
 */
export function FieldFrame({
  label,
  description,
  error,
  invalid,
  disabled,
  name,
  className,
  children,
}: FieldFrameProps) {
  const isInvalid = invalid ?? error != null;
  return (
    <Field invalid={isInvalid} disabled={disabled} name={name} className={className}>
      {label != null && <FieldLabel>{label}</FieldLabel>}
      {children}
      {isInvalid && error != null ? (
        <FieldError match>{error}</FieldError>
      ) : (
        description != null && <FieldDescription>{description}</FieldDescription>
      )}
    </Field>
  );
}
