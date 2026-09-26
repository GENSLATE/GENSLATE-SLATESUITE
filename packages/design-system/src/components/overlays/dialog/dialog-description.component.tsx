import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn } from '../../../utils/cn.util';
import type { DialogDescriptionProps } from './dialog.types';
import { dialogVariants } from './dialog.variants';

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <BaseDialog.Description
      data-slot="dialog-description"
      className={cn(dialogVariants().description(), className)}
      {...props}
    />
  );
}
