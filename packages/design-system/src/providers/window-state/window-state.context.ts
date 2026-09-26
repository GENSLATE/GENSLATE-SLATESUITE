import { createContext } from 'react';
import type { WindowState } from './window-state.types';

export const DEFAULT_WINDOW_STATE: WindowState = {
  isFocused: true,
  isMaximized: false,
  isFullscreen: false,
};

export const WindowStateContext = createContext<WindowState>(DEFAULT_WINDOW_STATE);
WindowStateContext.displayName = 'WindowStateContext';
