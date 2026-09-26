import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn } from '../../../utils/cn.util';
import type { DialogTitleProps } from './dialog.types';
import { dialogVariants } from './dialog.variants';

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <BaseDialog.Title
      data-slot="dialog-title"
      className={cn(dialogVariants().title(), className)}
      {...props}
    />
  );
}
