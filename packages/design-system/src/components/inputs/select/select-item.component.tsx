import { Select as BaseSelect } from '@base-ui/react/select';
import { listItem } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type {
  SelectGroupLabelProps,
  SelectGroupProps,
  SelectItemProps,
  SelectSeparatorProps,
} from './select.types';
import {
  selectGroupLabelVariants,
  selectItemIndicatorVariants,
  selectSeparatorVariants,
} from './select.variants';

/** A row with a leading macOS checkmark for the selected value. */
export function SelectItem({ icon, className, children, ...props }: SelectItemProps) {
  return (
    <BaseSelect.Item
      data-slot="select-item"
      className={cn(listItem({ inset: true }), className)}
      {...props}
    >
      <BaseSelect.ItemIndicator
        data-slot="select-item-indicator"
        className={selectItemIndicatorVariants()}
      >
        <Icon name="codicon:check" size={14} />
      </BaseSelect.ItemIndicator>
      {icon != null && (
        <Icon
          name={icon}
          size={14}
          className="text-fg-muted group-data-highlighted/item:text-on-accent"
        />
      )}
      <BaseSelect.ItemText data-slot="select-item-text" className="truncate-flex">
        {children}
      </BaseSelect.ItemText>
    </BaseSelect.Item>
  );
}

export function SelectGroup({ className, ...props }: SelectGroupProps) {
  return <BaseSelect.Group data-slot="select-group" className={className} {...props} />;
}

export function SelectGroupLabel({ className, ...props }: SelectGroupLabelProps) {
  return (
    <BaseSelect.GroupLabel
      data-slot="select-group-label"
      className={cn(selectGroupLabelVariants(), className)}
      {...props}
    />
  );
}

export function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return (
    <BaseSelect.Separator
      data-slot="select-separator"
      className={cn(selectSeparatorVariants(), className)}
      {...props}
    />
  );
}
