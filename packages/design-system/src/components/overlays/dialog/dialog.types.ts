import type { Dialog as BaseDialog } from '@base-ui/react/dialog';
import type { ComponentProps } from 'react';

export type DialogSize = 'sm' | 'md' | 'lg';
export type DialogButtonTone = 'default' | 'primary' | 'danger' | 'plain';

export interface DialogLabels {
  /** Accessible name of the corner close button. */
  close?: string | undefined;
}

export interface DialogProps extends BaseDialog.Root.Props {}

export interface DialogTriggerProps extends Omit<BaseDialog.Trigger.Props, 'className'> {
  className?: string | undefined;
}

export interface DialogPopupProps extends Omit<BaseDialog.Popup.Props, 'className'> {
  /** Max width: sm 400, md 520 (default), lg 720. */
  size?: DialogSize | undefined;
  /** Show a × button in the top-right corner. */
  showClose?: boolean | undefined;
  /** Dim the window behind (default true). */
  scrim?: boolean | undefined;
  className?: string | undefined;
  labels?: DialogLabels | undefined;
}

export interface DialogTitleProps extends Omit<BaseDialog.Title.Props, 'className'> {
  className?: string | undefined;
}

export interface DialogDescriptionProps extends Omit<BaseDialog.Description.Props, 'className'> {
  className?: string | undefined;
}

export interface DialogBodyProps extends Omit<ComponentProps<'div'>, 'className'> {
  className?: string | undefined;
}

export interface DialogFooterProps extends Omit<ComponentProps<'div'>, 'className'> {
  className?: string | undefined;
}

export interface DialogCloseProps extends Omit<BaseDialog.Close.Props, 'className'> {
  /** Button look: `default` (secondary), `primary` (accent), `danger`, or `plain` (unstyled). */
  tone?: DialogButtonTone | undefined;
  className?: string | undefined;
}
