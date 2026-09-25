import { Popover as BasePopover } from '@base-ui/react/popover';
import type { PopoverProps, PopoverTriggerProps } from './popover.types';

/** A floating panel anchored to a trigger (Base UI `Popover.Root`). */
export function Popover(props: PopoverProps) {
  return <BasePopover.Root {...props} />;
}

/** Opens the popover. Use `render` to supply your own button. */
export function PopoverTrigger({ className, ...props }: PopoverTriggerProps) {
  return <BasePopover.Trigger data-slot="popover-trigger" className={className} {...props} />;
}
