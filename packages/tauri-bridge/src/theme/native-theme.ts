import { getCurrentWindow } from '@tauri-apps/api/window';

import { isTauri } from '../runtime/runtime.detect';

/** The native (OS) appearance of a window. */
export type NativeTheme = 'dark' | 'light';

/**
 * Forces the native window appearance (titlebar, scrollbars, vibrancy) to match the app
 * theme; `null` follows the OS again. No-op in a browser.
 */
export async function setNativeTheme(theme: NativeTheme | null): Promise<void> {
  if (!isTauri()) return;
  await getCurrentWindow().setTheme(theme);
}
