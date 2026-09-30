/**
 * Small layout choices Gallery remembers between runs in the webview's storage (the open
 * collection, the side panel tab, whether it is shown). Storage can be missing or full
 * (private windows, locked-down webviews), so reads fall back and writes are best effort.
 */

const PREFIX = 'genslate.gallery.';

export type PreferenceKey = 'collection' | 'side-panel' | 'sidebar';

export function loadPreference(key: PreferenceKey): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    // Unavailable storage: start with the defaults.
    return null;
  }
}

export function savePreference(key: PreferenceKey, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // Unavailable or full storage: the choice simply isn't remembered.
  }
}
