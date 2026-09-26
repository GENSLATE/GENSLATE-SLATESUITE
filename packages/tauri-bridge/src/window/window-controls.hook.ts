import type { UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useMemo, useState } from 'react';

import { isTauri } from '../runtime/runtime.detect';

/** Actions and live state for a custom titlebar. */
export interface WindowControls {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
  /** Starts a native window drag; call from `pointerdown` on a drag region. */
  startDragging(): Promise<void>;
  isMaximized: boolean;
  isFocused: boolean;
  isFullscreen: boolean;
}

interface WindowState {
  readonly isMaximized: boolean;
  readonly isFocused: boolean;
  readonly isFullscreen: boolean;
}

// Stable module-level actions: no re-renders, safe no-ops in a browser.
const actions = {
  minimize: async (): Promise<void> => {
    if (isTauri()) await getCurrentWindow().minimize();
  },
  toggleMaximize: async (): Promise<void> => {
    if (isTauri()) await getCurrentWindow().toggleMaximize();
  },
  close: async (): Promise<void> => {
    if (isTauri()) await getCurrentWindow().close();
  },
  startDragging: async (): Promise<void> => {
    if (isTauri()) await getCurrentWindow().startDragging();
  },
} as const;

function initialState(): WindowState {
  const doc = globalThis.document as Document | undefined;
  return {
    isMaximized: false,
    isFocused: doc?.hasFocus() ?? true,
    isFullscreen: doc?.fullscreenElement != null,
  };
}

/**
 * Window actions plus `isMaximized` / `isFocused` / `isFullscreen`, kept in sync with the
 * native window (resize and focus events). In a browser, focus and fullscreen follow the
 * document and the actions do nothing.
 */
export function useWindowControls(): WindowControls {
  const [state, setState] = useState<WindowState>(initialState);

  useEffect(() => (isTauri() ? subscribeToTauri(setState) : subscribeToDocument(setState)), []);

  return useMemo(() => ({ ...actions, ...state }), [state]);
}

type SetState = (update: (previous: WindowState) => WindowState) => void;

function patch(setState: SetState, next: Partial<WindowState>): void {
  setState((previous) => {
    const merged = { ...previous, ...next };
    const changed =
      merged.isMaximized !== previous.isMaximized ||
      merged.isFocused !== previous.isFocused ||
      merged.isFullscreen !== previous.isFullscreen;
    return changed ? merged : previous;
  });
}

function subscribeToTauri(setState: SetState): () => void {
  const win = getCurrentWindow();
  let disposed = false;
  const cleanups: UnlistenFn[] = [];

  const track = (pending: Promise<UnlistenFn>): void => {
    pending.then(
      (unlisten) => {
        if (disposed) unlisten();
        else cleanups.push(unlisten);
      },
      () => undefined,
    );
  };

  const refreshBounds = async (): Promise<void> => {
    try {
      const [isMaximized, isFullscreen] = await Promise.all([
        win.isMaximized(),
        win.isFullscreen(),
      ]);
      if (!disposed) patch(setState, { isMaximized, isFullscreen });
    } catch {
      // Permission missing or window closing: keep the last known state.
    }
  };

  void refreshBounds();
  win.isFocused().then(
    (isFocused) => {
      if (!disposed) patch(setState, { isFocused });
    },
    () => undefined,
  );
  track(win.onResized(() => void refreshBounds()));
  track(
    win.onFocusChanged(({ payload: isFocused }) => {
      if (!disposed) patch(setState, { isFocused });
    }),
  );

  return () => {
    disposed = true;
    for (const unlisten of cleanups.splice(0)) unlisten();
  };
}

function subscribeToDocument(setState: SetState): () => void {
  const win = globalThis.window as Window | undefined;
  if (win === undefined) return () => undefined;
  const onFocus = (): void => patch(setState, { isFocused: true });
  const onBlur = (): void => patch(setState, { isFocused: false });
  const onFullscreen = (): void =>
    patch(setState, { isFullscreen: win.document.fullscreenElement != null });
  win.addEventListener('focus', onFocus);
  win.addEventListener('blur', onBlur);
  win.document.addEventListener('fullscreenchange', onFullscreen);
  return () => {
    win.removeEventListener('focus', onFocus);
    win.removeEventListener('blur', onBlur);
    win.document.removeEventListener('fullscreenchange', onFullscreen);
  };
}
