import { matchesHotkey, parseHotkey, usePlatform } from '@genslate/design-system';
import { useEffect, useEffectEvent } from 'react';

import { COMMANDS, isEnabled } from './commands.registry';
import type { GalleryApi } from './gallery.context';

/** A text box (or anything editable) has the focus. */
function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA') return true;
  return (
    target instanceof HTMLInputElement &&
    !['checkbox', 'radio', 'button', 'range'].includes(target.type)
  );
}

/**
 * One keydown listener for every command's shortcut. Bare keys (F, E, 1–5, Delete) never fire
 * from a text box; nothing fires while a dialog, menu, the editor or a slideshow has the keys.
 */
export function useCommandHotkeys(api: GalleryApi): void {
  const platform = usePlatform();

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    if (api.dialog.type !== 'none' || api.paletteOpen) return;
    if (api.mode.type === 'edit' || api.mode.type === 'slideshow') return;
    // A menu, popover or dialog from the design system has the focus.
    if (
      event.target instanceof Element &&
      event.target.closest('[role="menu"], [role="dialog"], [role="alertdialog"]')
    ) {
      return;
    }
    const inText = typing(event.target);
    // Enter and Space belong to a focused button, tab or switch.
    const onControl =
      event.target instanceof Element &&
      event.target.closest(
        'button, a, [role="button"], [role="tab"], [role="switch"], [role="slider"]',
      ) !== null;
    for (const entry of COMMANDS) {
      if (entry.shortcut === undefined || entry.soon === true) continue;
      if (!matchesHotkey(event, parseHotkey(entry.shortcut, platform))) continue;
      const bare = !/(mod|ctrl|alt|meta|cmd)\+/.test(entry.shortcut);
      if (bare && (inText || (onControl && entry.id === 'open'))) return;
      // Select all and Undo keep their text meaning in a text box.
      if (inText && (entry.id === 'select-all' || entry.id === 'undo')) return;
      event.preventDefault();
      if (isEnabled(entry, api)) entry.run(api);
      return;
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
}
