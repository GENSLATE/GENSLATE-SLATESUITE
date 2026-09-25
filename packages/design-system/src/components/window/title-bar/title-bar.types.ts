import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { Platform } from '../../../utils/platform.util';
import type { TrafficLightsLabels } from '../traffic-lights/traffic-lights.types';

export type TitleBarControls = 'traffic-lights' | 'windows' | 'none';

export interface TitleBarProps extends Omit<ComponentPropsWithRef<'header'>, 'title'> {
  /** Window title — centred when there is no command center, else the command center's text. */
  title?: ReactNode | undefined;
  /** Defaults to the `PlatformProvider` platform. */
  platform?: Platform | undefined;
  /**
   * Window buttons. Defaults by platform: macOS → `none` (native lights via the overlay titlebar,
   * with a spacer), Windows → `windows`, Linux / web → `traffic-lights`.
   */
  controls?: TitleBarControls | undefined;
  /** Defaults to the `WindowStateProvider` state. */
  isFocused?: boolean | undefined;
  isMaximized?: boolean | undefined;
  isFullscreen?: boolean | undefined;
  onMinimize?: (() => void) | undefined;
  onToggleMaximize?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
  /** Double-clicking empty titlebar space toggles maximize. @default true except on macOS (native). */
  doubleClickToMaximize?: boolean | undefined;
  /** After the window controls (sidebar toggle, app icon…). */
  leading?: ReactNode | undefined;
  /** The centre: usually a `TitleBarCommandCenter`. */
  center?: ReactNode | undefined;
  /** Right-aligned actions (icon buttons). */
  actions?: ReactNode | undefined;
  labels?: TrafficLightsLabels & { restore?: string } | undefined;
}

export interface TitleBarCommandCenterProps
  extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Text inside the pill, e.g. the workspace name or "Search…". */
  children?: ReactNode | undefined;
  /** Shortcut hint. `null` hides it. @default 'mod+k' */
  shortcut?: string | null | undefined;
}
