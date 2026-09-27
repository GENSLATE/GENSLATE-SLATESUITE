import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { Platform } from '../../../utils/platform.util';
import type { TrafficLightsLabels } from '../traffic-lights/traffic-lights.types';

export interface TitleBarProps extends Omit<ComponentPropsWithRef<'header'>, 'title'> {
  /** Window title — centred when there is no command center, else the command center's text. */
  title?: ReactNode | undefined;
  /**
   * Defaults to the `PlatformProvider` platform. Only affects children (shortcut glyphs such as
   * ⌘K vs Ctrl+K) — the chrome itself, traffic lights included, is identical on every OS.
   */
  platform?: Platform | undefined;
  /** Defaults to the `WindowStateProvider` state. Background windows show grey lights. */
  isFocused?: boolean | undefined;
  /** Defaults to the `WindowStateProvider` state. Flips the green light's glyph inwards. */
  isFullscreen?: boolean | undefined;
  onMinimize?: (() => void) | undefined;
  onToggleMaximize?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
  /**
   * Double-clicking empty titlebar space calls `onToggleMaximize`. Off by default because Tauri's
   * `data-tauri-drag-region` already maximizes on double-click natively (enabling both would
   * toggle twice); turn it on for hosts without a native drag region.
   * @default false
   */
  doubleClickToMaximize?: boolean | undefined;
  /** After the traffic lights (sidebar toggle, app icon…). */
  leading?: ReactNode | undefined;
  /** The centre: usually a `TitleBarCommandCenter`. */
  center?: ReactNode | undefined;
  /** Right-aligned actions (icon buttons). */
  actions?: ReactNode | undefined;
  labels?: TrafficLightsLabels | undefined;
}

export interface TitleBarCommandCenterProps
  extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Text inside the pill, e.g. the workspace name or "Search…". */
  children?: ReactNode | undefined;
  /** Shortcut hint. `null` hides it. @default 'mod+k' */
  shortcut?: string | null | undefined;
}
