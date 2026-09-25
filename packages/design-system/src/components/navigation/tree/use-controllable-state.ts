import { useState } from 'react';

/**
 * Controlled/uncontrolled state: uses `value` when defined, otherwise internal state seeded
 * from `defaultValue`. `setValue` always calls `onChange`.
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: ((next: T) => void) | undefined,
): [T, (next: T) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const setValue = (next: T) => {
    if (!controlled) setInternal(next);
    onChange?.(next);
  };
  return [controlled ? value : internal, setValue];
}
