import { Popover as BasePopover } from '@base-ui/react/popover';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { PopoverCloseProps } from './popover.types';
import { popoverVariants } from './popover.variants';

const styles = popoverVariants();

/** Closes the popover. Without children it renders a small × button (label via `aria-label`). */
export function PopoverClose({ className, children, ...props }: PopoverCloseProps) {
  if (children != null || props.render != null) {
    return (
      <BasePopover.Close data-slot="popover-close" className={className} {...props}>
        {children}
      </BasePopover.Close>
    );
  }
  return (
    <BasePopover.Close
      data-slot="popover-close"
      aria-label={props['aria-label'] ?? 'Close'}
      className={cn(styles.close(), className)}
      {...props}
    >
      <Icon name="codicon:close" size={14} />
    </BasePopover.Close>
  );
}
