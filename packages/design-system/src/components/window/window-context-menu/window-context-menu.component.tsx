import { type RefObject, useEffect, useRef, useState } from 'react';
import { usePlatform } from '../../../hooks/use-platform.hook';
import { useWindowState } from '../../../hooks/use-window-state.hook';
import { cn } from '../../../utils/cn.util';
import {
  ContextMenu,
  ContextMenuTrigger,
} from '../../overlays/context-menu/context-menu.component';
import { ContextMenuPopup } from '../../overlays/context-menu/context-menu-popup.component';
import { resolveContextTarget } from './context-target.util';
import { copyText, runFieldCommand, selectAllContent, webClipboard } from './text-edit.util';
import type { WindowContextMenuProps, WindowContextTarget } from './window-context-menu.types';
import { windowContextMenuVariants } from './window-context-menu.variants';
import {
  ContentItems,
  FieldItems,
  hasContentItems,
  resolveLabels,
  Sections,
  StatusbarItems,
  ThemeSubmenu,
  WindowItems,
} from './window-context-menu-items.component';

/** Hides the webview's own menu (Back, Reload, Inspect…) everywhere, including portals. */
function useNativeMenuGuard(allowNativeMenu: boolean) {
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      if (allowNativeMenu && event.shiftKey) {
        // Nothing else may cancel it, so the webview's menu (with Inspect) opens.
        event.stopPropagation();
        return;
      }
      event.preventDefault();
    };
    window.addEventListener('contextmenu', onContextMenu, { capture: true });
    return () => window.removeEventListener('contextmenu', onContextMenu, { capture: true });
  }, [allowNativeMenu]);
}

/** Shift+F10 and the Menu key open the menu for the focused element. */
function useKeyboardMenu(triggerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return;
      const focused = document.activeElement;
      const trigger = triggerRef.current;
      if (trigger === null || !(focused instanceof HTMLElement) || !trigger.contains(focused)) {
        return;
      }
      event.preventDefault();
      const rect = focused.getBoundingClientRect();
      focused.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + Math.min(rect.width / 2, 24),
          clientY: rect.top + rect.height / 2,
        }),
      );
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [triggerRef]);
}

/**
 * The window's right-click menu. Wrap the whole window once: it reads what was clicked and
 * shows the matching items —
 * - a text box: Undo · Redo · Cut · Copy · Paste · Delete · Select All
 * - the titlebar (`data-context-zone="titlebar"`): Theme ▸ · Minimize · Zoom · Close
 * - the status bar (`data-context-zone="statusbar"`): Copy the item's value
 * - content: Open / Copy link, Copy, Select All (where text is selectable)
 *
 * `items` adds the app's own rows above the built-in ones. Elements inside
 * `data-context-menu="none"` get no menu; a nested `ContextMenu` (e.g. a list's per-row menu)
 * takes precedence. The webview's native menu never shows (Shift+right-click with
 * `allowNativeMenu`).
 */
export function WindowContextMenu({
  children,
  items,
  onMinimize,
  onToggleMaximize,
  onClose,
  onOpenLink,
  hideTheme = false,
  clipboard,
  onError,
  allowNativeMenu = false,
  onOpenChange,
  platform: platformProp,
  glass = false,
  labels: labelsProp,
}: WindowContextMenuProps) {
  const contextPlatform = usePlatform();
  const { isMaximized } = useWindowState();
  const platform = platformProp ?? contextPlatform;
  const labels = resolveLabels(labelsProp);
  const [target, setTarget] = useState<WindowContextTarget | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const styles = windowContextMenuVariants();
  const board = clipboard ?? webClipboard();
  const hasWindowItems =
    onMinimize !== undefined || onToggleMaximize !== undefined || onClose !== undefined;

  useNativeMenuGuard(allowNativeMenu);
  useKeyboardMenu(triggerRef);

  const run = (task: () => Promise<void> | void) => {
    // Fire and forget: menu rows can't await, and failures (e.g. clipboard access refused)
    // go to `onError` so the app decides how to tell the user.
    void Promise.resolve()
      .then(task)
      .catch((error: unknown) => onError?.(error));
  };
  const copy = (text: string) => run(() => copyText(document, text, board));

  const renderItems = (current: WindowContextTarget) => {
    const extra = items?.(current);
    const theme = hideTheme ? null : <ThemeSubmenu labels={labels} />;
    switch (current.kind) {
      case 'field':
        return (
          <Sections>
            {[
              extra,
              <FieldItems
                key="field"
                target={current}
                labels={labels}
                platform={platform}
                canPaste={board?.readText !== undefined}
                onCommand={(command) => run(() => runFieldCommand(current, command, board))}
              />,
            ]}
          </Sections>
        );
      case 'titlebar':
        return (
          <Sections>
            {[
              extra,
              theme,
              hasWindowItems && (
                <WindowItems
                  key="window"
                  labels={labels}
                  platform={platform}
                  isMaximized={isMaximized}
                  onMinimize={onMinimize}
                  onToggleMaximize={onToggleMaximize}
                  onClose={onClose}
                />
              ),
            ]}
          </Sections>
        );
      case 'statusbar':
        return (
          <Sections>
            {[
              extra,
              <StatusbarItems key="status" target={current} labels={labels} onCopy={copy} />,
            ]}
          </Sections>
        );
      case 'content':
        return (
          <Sections>
            {[
              extra,
              hasContentItems(current) && (
                <ContentItems
                  key="content"
                  target={current}
                  labels={labels}
                  platform={platform}
                  onOpenLink={onOpenLink}
                  onCopy={copy}
                  onSelectAll={() => selectAllContent(current)}
                />
              ),
              theme,
            ]}
          </Sections>
        );
      default:
        return current satisfies never;
    }
  };

  return (
    <ContextMenu onOpenChange={(open) => onOpenChange?.(open)}>
      <ContextMenuTrigger
        ref={triggerRef}
        className={styles.trigger()}
        onContextMenu={(event) => {
          const element = event.target;
          // Portalled popups (dialogs, popovers) bubble here through React but sit outside the
          // window's DOM; they keep only the native-menu guard.
          const inside = element instanceof Element && event.currentTarget.contains(element);
          const next = inside ? resolveContextTarget(element) : null;
          // Plain content with the Theme row hidden and no app rows would be an empty menu.
          const empty =
            next?.kind === 'content' &&
            hideTheme &&
            !hasContentItems(next) &&
            (items?.(next) ?? null) === null;
          if (next === null || empty) {
            event.preventDefault();
            event.preventBaseUIHandler();
            return;
          }
          setTarget(next);
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuPopup
        data-zone={target?.zone}
        data-kind={target?.kind}
        glass={glass}
        className={cn(styles.popup())}
        finalFocus={() => (target?.kind === 'field' ? target.field : true)}
      >
        {target === null ? null : renderItems(target)}
      </ContextMenuPopup>
    </ContextMenu>
  );
}
