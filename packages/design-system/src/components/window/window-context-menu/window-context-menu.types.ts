import type { ReactNode } from 'react';
import type { Platform } from '../../../utils/platform.util';

/**
 * Where the right-click landed: the built-in areas, or any name an app puts on an element with
 * `data-context-zone="<name>"` (e.g. `rail`, `sidebar`).
 */
export type WindowContextZone = 'titlebar' | 'statusbar' | 'content' | (string & {});

/** A text input, text area or `contenteditable` element. */
export type EditableElement = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

/** The field's selection when the menu opened, restored before an edit command runs. */
export type FieldSelection =
  | {
      readonly type: 'offsets';
      readonly start: number;
      readonly end: number;
      readonly direction: 'forward' | 'backward' | 'none';
    }
  | { readonly type: 'range'; readonly range: Range | null };

interface TargetBase {
  /** The nearest `data-context-zone`, else the area the element sits in. */
  readonly zone: WindowContextZone;
  /** The element under the pointer (or the focused element, from the keyboard). */
  readonly element: Element;
}

/** An editable field: Undo · Redo · Cut · Copy · Paste · Delete · Select all. */
export interface FieldContextTarget extends TargetBase {
  readonly kind: 'field';
  readonly field: EditableElement;
  readonly selection: FieldSelection;
  readonly selectedText: string;
  readonly readOnly: boolean;
  /** Password fields never copy or cut. */
  readonly secret: boolean;
  readonly empty: boolean;
}

/** The titlebar: app items, Theme, then the window commands. */
export interface TitlebarContextTarget extends TargetBase {
  readonly kind: 'titlebar';
}

/** The status bar: app items, then Copy for the item under the pointer. */
export interface StatusbarContextTarget extends TargetBase {
  readonly kind: 'statusbar';
  /** From the nearest `data-context-copy`, else the status item's text. */
  readonly copyText: string | null;
}

/** Everything else: links, selected text, Select all (when the area is selectable), Theme. */
export interface ContentContextTarget extends TargetBase {
  readonly kind: 'content';
  readonly selectedText: string;
  /** `href` of the link under the pointer. */
  readonly link: string | null;
  /** From the nearest `data-context-copy`. */
  readonly copyText: string | null;
  /** The area allows text selection (not `user-select: none`). */
  readonly selectable: boolean;
  /** What Select all selects: the zone, else `<main>`, else the body. */
  readonly selectRoot: Element;
}

export type WindowContextTarget =
  | FieldContextTarget
  | TitlebarContextTarget
  | StatusbarContextTarget
  | ContentContextTarget;

/** Text clipboard used by Copy, Cut and Paste. Defaults to `navigator.clipboard`. */
export interface WindowContextClipboard {
  readonly readText?: (() => Promise<string>) | undefined;
  readonly writeText: (text: string) => Promise<void>;
}

export interface WindowContextMenuLabels {
  undo?: string | undefined;
  redo?: string | undefined;
  cut?: string | undefined;
  copy?: string | undefined;
  paste?: string | undefined;
  delete?: string | undefined;
  selectAll?: string | undefined;
  openLink?: string | undefined;
  copyLink?: string | undefined;
  /** Prefix of the status-bar copy row: `Copy “v0.1.0”`. */
  copyValue?: string | undefined;
  theme?: string | undefined;
  themeDark?: string | undefined;
  themeLight?: string | undefined;
  themeSystem?: string | undefined;
  minimize?: string | undefined;
  /** macOS name of the green light. */
  zoom?: string | undefined;
  maximize?: string | undefined;
  restore?: string | undefined;
  close?: string | undefined;
}

export interface WindowContextMenuProps {
  /** The whole window: titlebar, content and status bar. */
  children?: ReactNode | undefined;
  /**
   * App items for the area that was right-clicked, shown above the built-in ones. Return
   * `null` for none. Use `ContextMenuItem`, `ContextMenuCheckboxItem`, … (or the `Menu*` parts).
   */
  items?: ((target: WindowContextTarget) => ReactNode) | undefined;
  /** Titlebar: Minimize. Omit to leave the row out. */
  onMinimize?: (() => void) | undefined;
  /** Titlebar: Zoom (macOS) / Maximize · Restore. Omit to leave the row out. */
  onToggleMaximize?: (() => void) | undefined;
  /** Titlebar: Close. Omit to leave the row out. */
  onClose?: (() => void) | undefined;
  /** Opens a link (e.g. in the default browser). Without it, links only offer Copy link address. */
  onOpenLink?: ((href: string) => void) | undefined;
  /** Leave out the Theme submenu (e.g. an app with a fixed theme). */
  hideTheme?: boolean | undefined;
  /** Clipboard for Copy, Cut and Paste. @default navigator.clipboard */
  clipboard?: WindowContextClipboard | undefined;
  /** A clipboard read or write failed (e.g. the user denied clipboard access). */
  onError?: ((error: unknown) => void) | undefined;
  /** Shift+right-click shows the webview's own menu (Inspect) — for dev builds. @default false */
  allowNativeMenu?: boolean | undefined;
  /** Called when the menu opens or closes. */
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Platform used for labels and shortcut hints. Defaults to the `PlatformProvider`. */
  platform?: Platform | undefined;
  /** Translucent macOS material. */
  glass?: boolean | undefined;
  labels?: WindowContextMenuLabels | undefined;
}
