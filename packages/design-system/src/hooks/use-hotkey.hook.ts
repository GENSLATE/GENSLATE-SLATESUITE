import { useEffect, useLayoutEffect, useRef } from 'react';
import { type Platform, usesMacKeys } from '../utils/platform.util';
import { usePlatform } from './use-platform.hook';

export interface UseHotkeyOptions {
  /** @default true */
  enabled?: boolean | undefined;
  /** Call `preventDefault()` on a match. @default true */
  preventDefault?: boolean | undefined;
  /**
   * Fire while focus is in a text field. Defaults to `true` when the shortcut has a
   * modifier (`mod`, `ctrl`, `alt`/`option`, `meta`) and `false` for bare keys.
   */
  allowInInputs?: boolean | undefined;
  /** Overrides the platform used to resolve `mod` (⌘ on macOS, Ctrl elsewhere). */
  platform?: Platform | undefined;
}

interface ParsedHotkey {
  key: string;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

const KEY_ALIASES: Readonly<Record<string, string>> = {
  esc: 'escape',
  return: 'enter',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  space: ' ',
  plus: '+',
  del: 'delete',
};

/** Parses `"mod+shift+p"` for a platform. */
export function parseHotkey(shortcut: string, platform: Platform): ParsedHotkey {
  const mac = usesMacKeys(platform);
  const parsed: ParsedHotkey = { key: '', meta: false, ctrl: false, alt: false, shift: false };
  for (const raw of shortcut.toLowerCase().split('+')) {
    const part = raw.trim();
    if (part === 'mod') {
      if (mac) parsed.meta = true;
      else parsed.ctrl = true;
    } else if (part === 'cmd' || part === 'meta') parsed.meta = true;
    else if (part === 'ctrl' || part === 'control') parsed.ctrl = true;
    else if (part === 'alt' || part === 'option') parsed.alt = true;
    else if (part === 'shift') parsed.shift = true;
    else if (part) parsed.key = KEY_ALIASES[part] ?? part;
  }
  return parsed;
}

/** True when a keyboard event matches a parsed hotkey (modifiers must match exactly). */
export function matchesHotkey(event: KeyboardEvent, hotkey: ParsedHotkey): boolean {
  if (event.metaKey !== hotkey.meta || event.ctrlKey !== hotkey.ctrl) return false;
  if (event.altKey !== hotkey.alt || event.shiftKey !== hotkey.shift) return false;
  const key = hotkey.key;
  if (event.key.toLowerCase() === key) return true;
  // Layout-independent fallback: ⌥/⇧ change `event.key` (⌥L → ¬), `event.code` does not.
  if (/^[a-z]$/.test(key)) return event.code === `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return event.code === `Digit${key}`;
  return false;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = (target as HTMLInputElement).type;
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(
    type,
  );
}

/**
 * Binds a global keyboard shortcut. `mod` is ⌘ on macOS and Ctrl elsewhere.
 *   useHotkey('mod+k', openPalette);
 *   useHotkey('mod+shift+l', toggleTheme);
 */
export function useHotkey(
  shortcut: string,
  handler: (event: KeyboardEvent) => void,
  options: UseHotkeyOptions = {},
): void {
  const contextPlatform = usePlatform();
  const {
    enabled = true,
    preventDefault = true,
    allowInInputs,
    platform = contextPlatform,
  } = options;

  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const hotkey = parseHotkey(shortcut, platform);
    const inInputs = allowInInputs ?? (hotkey.meta || hotkey.ctrl || hotkey.alt);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented) return;
      if (!matchesHotkey(event, hotkey)) return;
      if (!inInputs && isEditable(event.target)) return;
      if (preventDefault) event.preventDefault();
      handlerRef.current(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcut, platform, enabled, preventDefault, allowInInputs]);
}
