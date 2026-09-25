import { Popover as BasePopover } from '@base-ui/react/popover';
import { cn } from '../../../utils/cn.util';
import type { PopoverDescriptionProps } from './popover.types';
import { popoverVariants } from './popover.variants';

const styles = popoverVariants();

export function PopoverDescription({ className, ...props }: PopoverDescriptionProps) {
  return (
    <BasePopover.Description
      data-slot="popover-description"
      className={cn(styles.description(), className)}
      {...props}
    />
  );
}
