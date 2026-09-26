import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import { cn } from '../../../utils/cn.util';
import { dialogVariants } from '../dialog/dialog.variants';
import type { AlertDialogDescriptionProps } from './alert-dialog.types';

export function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return (
    <BaseAlertDialog.Description
      data-slot="alert-dialog-description"
      className={cn(dialogVariants().description(), className)}
      {...props}
    />
  );
}
