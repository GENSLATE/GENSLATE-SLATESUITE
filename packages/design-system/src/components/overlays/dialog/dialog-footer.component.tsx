import { cn } from '../../../utils/cn.util';
import type { DialogFooterProps } from './dialog.types';
import { dialogVariants } from './dialog.variants';

/** Right-aligned actions: put the default (primary) action last, macOS style. */
export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(dialogVariants().footer(), className)}
      {...props}
    />
  );
}
