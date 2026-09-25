import type { ReactNode } from 'react';

export interface WindowState {
  /** The window has keyboard focus (inactive windows dim their chrome). */
  isFocused: boolean;
  isMaximized: boolean;
  isFullscreen: boolean;
}

export interface WindowStateProviderProps extends Partial<WindowState> {
  children?: ReactNode | undefined;
}
