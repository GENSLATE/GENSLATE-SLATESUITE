import { cn } from '../../../utils/cn.util';
import { dialogVariants } from '../dialog/dialog.variants';
import type { AlertDialogFooterProps } from './alert-dialog.types';

export function AlertDialogFooter({ className, ...props }: AlertDialogFooterProps) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(dialogVariants().footer(), className)}
      {...props}
    />
  );
}
