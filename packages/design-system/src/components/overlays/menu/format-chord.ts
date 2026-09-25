import type { Platform } from '../../../utils/platform.util';
import { formatShortcut } from '../../../utils/shortcut.util';

/** Formats a shortcut that may be a chord (`"mod+k mod+t"` → `⌘K ⌘T` / `Ctrl+K Ctrl+T`). */
export function formatChord(shortcut: string, platform: Platform): string {
  return shortcut
    .trim()
    .split(/\s+/)
    .map((stroke) => formatShortcut(stroke, platform))
    .join(' ');
}
