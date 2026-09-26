import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import type { AlertDialogProps, AlertDialogTriggerProps } from './alert-dialog.types';

/** A dialog that requires a decision (no outside-click dismissal). */
export function AlertDialog(props: AlertDialogProps) {
  return <BaseAlertDialog.Root {...props} />;
}

export function AlertDialogTrigger({ className, ...props }: AlertDialogTriggerProps) {
  return (
    <BaseAlertDialog.Trigger data-slot="alert-dialog-trigger" className={className} {...props} />
  );
}
