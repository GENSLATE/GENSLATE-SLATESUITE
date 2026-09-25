import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn } from '../../../utils/cn.util';
import type { DialogCloseProps } from './dialog.types';
import { dialogButtonVariants } from './dialog.variants';

/** Closes the dialog; styled as a footer push button unless `tone="plain"` or `render` is given. */
export function DialogClose({ tone = 'default', className, ...props }: DialogCloseProps) {
  return (
    <BaseDialog.Close
      data-slot="dialog-close"
      className={cn(props.render == null && dialogButtonVariants({ tone }), className)}
      {...props}
    />
  );
}
