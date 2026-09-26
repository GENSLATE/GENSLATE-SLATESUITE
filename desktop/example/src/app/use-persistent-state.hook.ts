import { useEffect, useState } from 'react';

/** `useState` backed by localStorage (best-effort: storage may be unavailable). */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T = (_value): _value is T => true,
): [T, (value: T | ((previous: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore: persistence is a convenience.
    }
  }, [key, value]);

  return [value, setValue];
}
