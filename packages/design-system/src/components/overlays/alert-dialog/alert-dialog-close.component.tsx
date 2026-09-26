import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import { cn } from '../../../utils/cn.util';
import { dialogButtonVariants } from '../dialog/dialog.variants';
import type { AlertDialogCloseProps } from './alert-dialog.types';

/** A footer button that closes the alert (use `tone="danger"` for the destructive choice). */
export function AlertDialogClose({ tone = 'default', className, ...props }: AlertDialogCloseProps) {
  return (
    <BaseAlertDialog.Close
      data-slot="alert-dialog-close"
      className={cn(props.render == null && dialogButtonVariants({ tone }), className)}
      {...props}
    />
  );
}
