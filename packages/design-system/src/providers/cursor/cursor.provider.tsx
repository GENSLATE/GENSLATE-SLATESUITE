import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useControllableState } from '../../hooks/use-controllable-state.hook';
import { CursorContext } from './cursor.context';
import type { CursorContextValue, CursorProviderProps, CursorStyle } from './cursor.types';

export const CURSOR_STORAGE_KEY = 'genslate.cursor';
export const CURSOR_STYLES = ['themed', 'system'] as const satisfies readonly CursorStyle[];

export function isCursorStyle(value: unknown): value is CursorStyle {
  return typeof value === 'string' && (CURSOR_STYLES as readonly string[]).includes(value);
}

function readStoredCursorStyle(storageKey: string): CursorStyle | null {
  try {
    const value = globalThis.localStorage?.getItem(storageKey);
    return isCursorStyle(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Applies the cursor style to `<html data-cursor>` and shares it through `useCursorStyle()`.
 * `system` hands every `--gs-cursor-*` back to the OS keyword (forced-colours mode does so too),
 * for people who rely on an enlarged or high-visibility OS pointer that custom images ignore.
 */
export function CursorProvider({
  children,
  cursorStyle: cursorStyleProp,
  defaultCursorStyle = 'themed',
  onCursorStyleChange,
  cursorStorageKey = CURSOR_STORAGE_KEY,
}: CursorProviderProps) {
  const [cursorStyle, setCursorStyle, isControlled] = useControllableState<CursorStyle>({
    value: cursorStyleProp,
    defaultValue: () =>
      (cursorStorageKey ? readStoredCursorStyle(cursorStorageKey) : null) ?? defaultCursorStyle,
    onChange: onCursorStyleChange,
  });

  useLayoutEffect(() => {
    document.documentElement.dataset['cursor'] = cursorStyle;
  }, [cursorStyle]);

  useEffect(() => {
    if (isControlled || !cursorStorageKey) return;
    try {
      localStorage.setItem(cursorStorageKey, cursorStyle);
    } catch {
      // Storage can be unavailable (private mode, sandboxed webviews): the style still applies.
    }
  }, [isControlled, cursorStorageKey, cursorStyle]);

  const value = useMemo<CursorContextValue>(
    () => ({ cursorStyle, setCursorStyle }),
    [cursorStyle, setCursorStyle],
  );

  return <CursorContext value={value}>{children}</CursorContext>;
}
