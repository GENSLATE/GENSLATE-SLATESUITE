import type { ComponentPropsWithRef } from 'react';

export interface WindowControlsProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  onMinimize?: (() => void) | undefined;
  onToggleMaximize?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
  /** Shows the restore glyph. */
  isMaximized?: boolean | undefined;
  labels?: {
    group?: string | undefined;
    minimize?: string | undefined;
    maximize?: string | undefined;
    restore?: string | undefined;
    close?: string | undefined;
  };
}
