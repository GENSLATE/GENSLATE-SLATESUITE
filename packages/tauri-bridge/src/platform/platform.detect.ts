import { platform as osPlatform } from '@tauri-apps/plugin-os';

import { isTauri } from '../runtime/runtime.detect';

/** Where the UI runs. Drives `html[data-platform]` and window-chrome layout. */
export type Platform = 'macos' | 'windows' | 'linux' | 'web';

/**
 * Synchronously detects the platform: the OS plugin's compile-time value inside Tauri,
 * `'web'` in a plain browser.
 */
export function detectPlatform(): Platform {
  if (!isTauri()) return 'web';
  try {
    return fromOsName(osPlatform());
  } catch {
    // The OS plugin is not registered: fall back to the user agent.
    return fromUserAgent(globalThis.navigator?.userAgent ?? '');
  }
}

function fromOsName(name: string): Platform {
  switch (name) {
    case 'macos':
    case 'ios':
      return 'macos';
    case 'windows':
      return 'windows';
    default:
      return 'linux';
  }
}

function fromUserAgent(userAgent: string): Platform {
  if (/Mac OS X|Macintosh/i.test(userAgent)) return 'macos';
  if (/Windows/i.test(userAgent)) return 'windows';
  return 'linux';
}
