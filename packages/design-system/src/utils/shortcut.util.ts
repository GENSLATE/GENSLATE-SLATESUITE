import { type Platform, usesMacKeys } from './platform.util';

const MAC_SYMBOLS: Readonly<Record<string, string>> = {
  mod: '⌘',
  cmd: '⌘',
  meta: '⌘',
  ctrl: '⌃',
  control: '⌃',
  alt: '⌥',
  option: '⌥',
  shift: '⇧',
  enter: '↩',
  return: '↩',
  backspace: '⌫',
  delete: '⌦',
  escape: '⎋',
  esc: '⎋',
  tab: '⇥',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: 'Space',
};

const PC_NAMES: Readonly<Record<string, string>> = {
  mod: 'Ctrl',
  cmd: 'Ctrl',
  meta: 'Win',
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
  enter: 'Enter',
  return: 'Enter',
  backspace: 'Backspace',
  delete: 'Del',
  escape: 'Esc',
  esc: 'Esc',
  tab: 'Tab',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: 'Space',
};

/**
 * Splits a shortcut like `"mod+shift+p"` into display keys for the platform:
 * macOS → `["⌘", "⇧", "P"]`, elsewhere → `["Ctrl", "Shift", "P"]`.
 */
export function shortcutKeys(shortcut: string, platform: Platform): string[] {
  const names = usesMacKeys(platform) ? MAC_SYMBOLS : PC_NAMES;
  return shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => names[part.toLowerCase()] ?? (part.length === 1 ? part.toUpperCase() : part));
}

/** A shortcut as one string: `⌘⇧P` on macOS, `Ctrl+Shift+P` elsewhere. */
export function formatShortcut(shortcut: string, platform: Platform): string {
  const keys = shortcutKeys(shortcut, platform);
  return usesMacKeys(platform) ? keys.join('') : keys.join('+');
}
