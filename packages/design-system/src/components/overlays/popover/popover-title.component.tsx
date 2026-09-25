import { Popover as BasePopover } from '@base-ui/react/popover';
import { cn } from '../../../utils/cn.util';
import type { PopoverTitleProps } from './popover.types';
import { popoverVariants } from './popover.variants';

const styles = popoverVariants();

export function PopoverTitle({ className, ...props }: PopoverTitleProps) {
  return (
    <BasePopover.Title
      data-slot="popover-title"
      className={cn(styles.title(), className)}
      {...props}
    />
  );
}
