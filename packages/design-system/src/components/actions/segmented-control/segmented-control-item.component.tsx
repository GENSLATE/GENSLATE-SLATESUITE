import { Toggle } from '@base-ui/react/toggle';
import { use } from 'react';
import { cn } from '../../../utils/cn.util';
import { renderIconSlot } from '../../display/icon/icon.slot';
import { SegmentedControlContext } from './segmented-control.context';
import type { SegmentedControlItemProps } from './segmented-control.types';
import { segmentedControlVariants } from './segmented-control.variants';

/** One segment of a `SegmentedControl`. */
export function SegmentedControlItem<Value extends string = string>({
  value,
  icon,
  label,
  className,
  children,
  ...props
}: SegmentedControlItemProps<Value>) {
  const { size } = use(SegmentedControlContext);
  const iconOnly = children == null && icon != null;
  return (
    <Toggle<Value>
      data-slot="segmented-control-item"
      value={value}
      aria-label={iconOnly ? label : undefined}
      title={label}
      className={cn(segmentedControlVariants({ size }).item(), iconOnly && 'px-2', className)}
      {...props}
    >
      {icon != null && renderIconSlot(icon, size === 'sm' ? 14 : 16)}
      {children}
    </Toggle>
  );
}
