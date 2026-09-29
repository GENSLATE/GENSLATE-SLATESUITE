import { usePlatform } from '@genslate/design-system';
import { useEffect, useEffectEvent } from 'react';

import { commandFor, isEnabled } from './commands.registry';
import type { TerminalApi } from './terminal.context';

/** The terminal's own input (xterm's hidden text area): its keys are checked by the session. */
const TERMINAL_INPUT = '.xterm-helper-textarea';

/** A text box (not the terminal) has the focus. */
function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement) || target.matches(TERMINAL_INPUT)) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA') return true;
  return (
    target instanceof HTMLInputElement && !['checkbox', 'radio', 'button'].includes(target.type)
  );
}

/**
 * One keydown listener for every command's shortcut, for keys pressed outside the terminal
 * (the side panel, the titlebar). Inside a terminal the session asks `isAppShortcut` first and
 * lets the key through to here. Nothing fires while a dialog, menu or the palette is open, and
 * text boxes keep their own editing keys.
 */
export function useCommandHotkeys(api: TerminalApi): void {
  const platform = usePlatform();

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    if (api.dialog.type !== 'none' || api.paletteOpen) return;
    if (
      event.target instanceof Element &&
      event.target.closest('[role="menu"], [role="dialog"], [role="alertdialog"]')
    ) {
      return;
    }
    const entry = commandFor(event, platform);
    if (entry === undefined) return;
    // In a text box, only shortcuts that can't be editing keys (Ctrl+Shift, ⌘⇧, Alt) run.
    if (typing(event.target) && !(event.shiftKey && (event.ctrlKey || event.metaKey))) return;
    event.preventDefault();
    if (isEnabled(entry, api)) entry.run(api);
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
}
