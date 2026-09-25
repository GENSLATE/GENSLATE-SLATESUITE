import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface UseControllableStateOptions<T> {
  /** Controlled value. When defined, the hook mirrors it and never stores its own. */
  value?: T | undefined;
  /** Initial value when uncontrolled (a function is called once, lazily). */
  defaultValue: T | (() => T);
  /** Called with every requested change, controlled or not. */
  onChange?: ((value: T) => void) | undefined;
}

/**
 * State that can be controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 * Returns `[value, setValue, isControlled]`; `setValue` accepts a value or an updater.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateOptions<T>): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const [inner, setInner] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : inner;

  // Latest values for a stable setter (handlers may be captured by effects and listeners).
  const latest = useRef({ current, isControlled, onChange });
  useLayoutEffect(() => {
    latest.current = { current, isControlled, onChange };
  });

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    const { current: prev, isControlled: controlled, onChange: notify } = latest.current;
    const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
    if (Object.is(resolved, prev)) return;
    if (!controlled) setInner(resolved);
    latest.current = { ...latest.current, current: resolved };
    notify?.(resolved);
  }, []);

  return [current, setValue, isControlled];
}
