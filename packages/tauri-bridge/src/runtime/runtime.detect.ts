import { isTauri as coreIsTauri } from '@tauri-apps/api/core';

/**
 * `true` inside a Tauri WebView, `false` in a plain browser, tests or SSR.
 * Every other bridge API checks this first and degrades to a safe no-op.
 */
export function isTauri(): boolean {
  try {
    return coreIsTauri();
  } catch {
    return false;
  }
}
