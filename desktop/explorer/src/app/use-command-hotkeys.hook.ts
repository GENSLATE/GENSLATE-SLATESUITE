import { matchesHotkey, parseHotkey, usePlatform } from '@genslate/design-system';
import { useEffect, useEffectEvent } from 'react';

import { COMMANDS, isEnabled } from './commands.registry';
import type { ExplorerApi } from './explorer.context';

/** A text box (or anything editable) has the focus. */
function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA') return true;
  return (
    target instanceof HTMLInputElement && !['checkbox', 'radio', 'button'].includes(target.type)
  );
}

/**
 * One keydown listener for every command's shortcut. File commands (`scope: 'files'`) stay
 * off while typing, so Copy, Paste and Delete keep working in text boxes; nothing fires while
 * a dialog or menu is open.
 */
export function useCommandHotkeys(api: ExplorerApi): void {
  const platform = usePlatform();

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    if (api.dialog.type !== 'none' || api.paletteOpen) return;
    // A menu, popover or dialog from the design system has the focus.
    if (
      event.target instanceof Element &&
      event.target.closest('[role="menu"], [role="dialog"], [role="alertdialog"]')
    ) {
      return;
    }
    const inText = typing(event.target);
    for (const entry of COMMANDS) {
      if (entry.shortcut === undefined || entry.soon === true) continue;
      if (!matchesHotkey(event, parseHotkey(entry.shortcut, platform))) continue;
      if (entry.scope === 'files' && inText) return;
      // Bare keys (F2, Delete) never fire from a text box either.
      if (inText && !/(mod|ctrl|alt|meta|cmd)\+/.test(entry.shortcut)) return;
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
