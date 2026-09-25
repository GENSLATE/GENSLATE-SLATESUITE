import { use } from 'react';
import { WindowStateContext } from '../providers/window-state/window-state.context';
import type { WindowState } from '../providers/window-state/window-state.types';

/** Native window state (`isFocused`, `isMaximized`, `isFullscreen`); focused/restored outside a provider. */
export function useWindowState(): WindowState {
  return use(WindowStateContext);
}
