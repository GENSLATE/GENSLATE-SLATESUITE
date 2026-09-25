import type { ComponentPropsWithRef } from 'react';

export interface TrafficLightsLabels {
  group?: string | undefined;
  close?: string | undefined;
  minimize?: string | undefined;
  maximize?: string | undefined;
  exitFullscreen?: string | undefined;
}

export interface TrafficLightsProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  onClose?: (() => void) | undefined;
  onMinimize?: (() => void) | undefined;
  /** The green light (zoom / full screen). */
  onToggleMaximize?: (() => void) | undefined;
  /** Grey lights (the window is in the background). Defaults to the `WindowStateProvider` state. */
  isFocused?: boolean | undefined;
  /** Green glyph points inwards (exit full screen). */
  isFullscreen?: boolean | undefined;
  /** Disable individual lights (they render grey and are not operable). */
  disabled?: { close?: boolean; minimize?: boolean; maximize?: boolean };
  labels?: TrafficLightsLabels | undefined;
}
