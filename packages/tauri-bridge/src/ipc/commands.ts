import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

import { isTauri } from '../runtime/runtime.detect';
import type { AppInfo } from './app-info.types';

const EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

/**
 * Typed wrappers around the app's Rust commands and plugins. Rejections carry a
 * `CommandError` (see `isCommandError`).
 */
export const commands = {
  /** Build metadata from `get_app_info`; `null` in a browser. */
  async appInfo(): Promise<AppInfo | null> {
    if (!isTauri()) return null;
    return await invoke<AppInfo>('get_app_info');
  },

  /**
   * Opens a link in the default browser (opener plugin; the capability only allows
   * `https://`). In a browser, opens a new tab without an opener reference.
   */
  async openExternal(url: string): Promise<void> {
    const parsed = new URL(url);
    if (!EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      throw new TypeError(`openExternal: unsupported protocol ${parsed.protocol}`);
    }
    if (isTauri()) {
      await openUrl(parsed.href);
      return;
    }
    globalThis.window?.open(parsed.href, '_blank', 'noopener,noreferrer');
  },
} as const;
