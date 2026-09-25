import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import { cn } from '../../../utils/cn.util';
import { dialogVariants } from '../dialog/dialog.variants';
import type { AlertDialogTitleProps } from './alert-dialog.types';

export function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return (
    <BaseAlertDialog.Title
      data-slot="alert-dialog-title"
      className={cn(dialogVariants().title(), 'pr-0', className)}
      {...props}
    />
  );
}
