import { useLayoutEffect, useMemo } from 'react';
import { WindowStateContext } from './window-state.context';
import type { WindowState, WindowStateProviderProps } from './window-state.types';

/**
 * Shares the native window state and writes `<html data-window-focused>` (enables `window-inactive:`),
 * `data-window-maximized` and `data-window-fullscreen`.
 */
export function WindowStateProvider({
  children,
  isFocused = true,
  isMaximized = false,
  isFullscreen = false,
}: WindowStateProviderProps) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset['windowFocused'] = String(isFocused);
    root.dataset['windowMaximized'] = String(isMaximized);
    root.dataset['windowFullscreen'] = String(isFullscreen);
  }, [isFocused, isMaximized, isFullscreen]);

  const value = useMemo<WindowState>(
    () => ({ isFocused, isMaximized, isFullscreen }),
    [isFocused, isMaximized, isFullscreen],
  );

  return <WindowStateContext value={value}>{children}</WindowStateContext>;
}
