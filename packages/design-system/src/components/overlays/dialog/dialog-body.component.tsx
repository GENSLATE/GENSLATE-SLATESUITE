import { cn } from '../../../utils/cn.util';
import type { DialogBodyProps } from './dialog.types';
import { dialogVariants } from './dialog.variants';

/** Scrollable content between the header and the footer. */
export function DialogBody({ className, ...props }: DialogBodyProps) {
  return (
    <div data-slot="dialog-body" className={cn(dialogVariants().body(), className)} {...props} />
  );
}
