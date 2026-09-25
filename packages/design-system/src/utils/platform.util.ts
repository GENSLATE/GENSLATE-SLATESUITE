/** Where the UI runs. Mirrors `@genslate/tauri-bridge`'s `Platform` without importing Tauri. */
export type Platform = 'macos' | 'windows' | 'linux' | 'web';

/** Best-effort platform guess from the user agent (used only when no platform prop is given). */
export function guessPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent;
  if (/Mac|iPhone|iPad/i.test(ua)) return 'macos';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Linux|X11/i.test(ua)) return 'linux';
  return 'web';
}

/** True when shortcuts should render with macOS symbols (⌘⌥⇧⌃). */
export const usesMacKeys = (platform: Platform) =>
  platform === 'macos' || (platform === 'web' && guessPlatform() === 'macos');
