/**
 * Creates the window's `SessionRegistry` once and keeps it in step with React: the terminal
 * look follows the theme and settings, panes that leave the layout end their shells, and the
 * backend's events (a shell exited, a second launch asked for a tab) reach the sessions.
 */
import { useTheme } from '@genslate/design-system';
import { type RefObject, useEffect, useState } from 'react';

import type { FinishedCommand } from '../engine/pane-store';
import { SessionRegistry } from '../engine/session-registry';
import type { TerminalLook } from '../engine/terminal-session';
import type { TerminalBackend } from '../ipc/terminal.client';
import type { HostPlatform, Settings } from '../ipc/terminal.types';
import { allPanes, type LayoutState } from '../model/layout.reducer';

/** What the sessions call back into; read through a ref so it is always current. */
export interface SessionCallbacks {
  isAppShortcut(event: KeyboardEvent): boolean;
  onInput(paneId: string, data: string): void;
  onPaste(paneId: string, text: string): void;
  onCommandFinished(paneId: string, command: FinishedCommand): void;
  onNaturalLanguage(paneId: string): void;
  onExplain(paneId: string, command: FinishedCommand): void;
  onOpenUrl(url: string): void;
  onOpenPath(paneId: string, path: string): void;
  onFocus(paneId: string): void;
  readonly settings: Settings;
}

function look(settings: Settings, theme: TerminalLook['theme']): TerminalLook {
  return {
    theme,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    cursorStyle: settings.cursorStyle,
    cursorBlink: settings.cursorBlink,
    scrollback: settings.scrollback,
  };
}

export function useSessionRegistry(
  backend: TerminalBackend,
  platform: HostPlatform,
  settings: Settings,
  layout: LayoutState,
  callbacks: RefObject<SessionCallbacks | null>,
): SessionRegistry {
  const { resolvedTheme } = useTheme();
  const [registry] = useState(
    () =>
      new SessionRegistry(
        {
          backend,
          platform,
          isAppShortcut: (event) => callbacks.current?.isAppShortcut(event) ?? false,
          onInput: (paneId, data) => callbacks.current?.onInput(paneId, data),
          onPaste: (paneId, text) => callbacks.current?.onPaste(paneId, text),
          onCommandFinished: (paneId, command) =>
            callbacks.current?.onCommandFinished(paneId, command),
          onNaturalLanguage: (paneId) => callbacks.current?.onNaturalLanguage(paneId),
          onExplain: (paneId, command) => callbacks.current?.onExplain(paneId, command),
          onOpenUrl: (url) => callbacks.current?.onOpenUrl(url),
          onOpenPath: (paneId, path) => callbacks.current?.onOpenPath(paneId, path),
          onFocus: (paneId) => callbacks.current?.onFocus(paneId),
          copyOnSelect: () => callbacks.current?.settings.copyOnSelect ?? false,
          visualBell: () => callbacks.current?.settings.bell === 'visual',
        },
        look(settings, resolvedTheme),
      ),
  );

  useEffect(() => {
    registry.setLook(look(settings, resolvedTheme));
  }, [registry, settings, resolvedTheme]);

  // Panes that left the layout end their shells.
  useEffect(() => {
    registry.prune(new Set(allPanes(layout).map((pane) => pane.id)));
  }, [registry, layout]);

  return registry;
}
