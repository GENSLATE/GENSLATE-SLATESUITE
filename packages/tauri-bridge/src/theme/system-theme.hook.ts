import type { UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';

import { isTauri } from '../runtime/runtime.detect';
import type { NativeTheme } from './native-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function mediaQuery(): MediaQueryList | undefined {
  return typeof globalThis.matchMedia === 'function'
    ? globalThis.matchMedia(DARK_QUERY)
    : undefined;
}

/** Current OS scheme; Polar Night (dark) when it cannot be read. */
function readMediaTheme(): NativeTheme {
  const query = mediaQuery();
  if (query === undefined) return 'dark';
  return query.matches ? 'dark' : 'light';
}

/**
 * The OS light/dark preference, live. Uses `prefers-color-scheme` everywhere and, inside
 * Tauri, the window's `onThemeChanged` event (which also reports `setNativeTheme` changes).
 */
export function useSystemTheme(): NativeTheme {
  const [theme, setTheme] = useState<NativeTheme>(readMediaTheme);

  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | undefined;

    const query = mediaQuery();
    const onChange = (event: MediaQueryListEvent): void =>
      setTheme(event.matches ? 'dark' : 'light');
    query?.addEventListener('change', onChange);

    if (isTauri()) {
      const win = getCurrentWindow();
      win.theme().then(
        (native) => {
          if (!disposed && native !== null) setTheme(native);
        },
        () => undefined,
      );
      win
        .onThemeChanged(({ payload }) => {
          if (!disposed) setTheme(payload);
        })
        .then(
          (stop) => {
            if (disposed) stop();
            else unlisten = stop;
          },
          () => undefined,
        );
    }

    return () => {
      disposed = true;
      query?.removeEventListener('change', onChange);
      unlisten?.();
    };
  }, []);

  return theme;
}
