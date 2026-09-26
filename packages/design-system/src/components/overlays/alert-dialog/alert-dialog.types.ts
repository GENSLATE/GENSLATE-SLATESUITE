import type { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import type { ComponentProps } from 'react';
import type { CodiconRef } from '../../display/icon/icon.types';
import type { DialogButtonTone, DialogSize } from '../dialog/dialog.types';

export type AlertDialogTone = 'default' | 'danger';

export interface AlertDialogProps extends BaseAlertDialog.Root.Props {}

export interface AlertDialogTriggerProps extends Omit<BaseAlertDialog.Trigger.Props, 'className'> {
  className?: string | undefined;
}

export interface AlertDialogPopupProps extends Omit<BaseAlertDialog.Popup.Props, 'className'> {
  /** `danger` marks a destructive confirmation (warning glyph in danger colour). */
  tone?: AlertDialogTone | undefined;
  /** Leading glyph; defaults to a warning sign for `danger`. Pass `null` for none. */
  icon?: CodiconRef | null | undefined;
  size?: DialogSize | undefined;
  className?: string | undefined;
}

export interface AlertDialogTitleProps extends Omit<BaseAlertDialog.Title.Props, 'className'> {
  className?: string | undefined;
}

export interface AlertDialogDescriptionProps
  extends Omit<BaseAlertDialog.Description.Props, 'className'> {
  className?: string | undefined;
}

export interface AlertDialogFooterProps extends Omit<ComponentProps<'div'>, 'className'> {
  className?: string | undefined;
}

export interface AlertDialogCloseProps extends Omit<BaseAlertDialog.Close.Props, 'className'> {
  tone?: DialogButtonTone | undefined;
  className?: string | undefined;
}
