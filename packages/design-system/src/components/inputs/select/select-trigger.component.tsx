import { Select as BaseSelect } from '@base-ui/react/select';
import { field } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { SelectTriggerProps, SelectValueProps } from './select.types';
import { selectIconVariants, selectTriggerVariants, selectValueVariants } from './select.variants';

/** The pop-up button: field chrome, current value and an up/down chevron. */
export function SelectTrigger({
  size = 'md',
  placeholder,
  className,
  children,
  ...props
}: SelectTriggerProps) {
  return (
    <BaseSelect.Trigger
      data-slot="select-trigger"
      className={cn(field({ size }), selectTriggerVariants(), className)}
      {...props}
    >
      {children ?? <SelectValue placeholder={placeholder} />}
      <BaseSelect.Icon data-slot="select-icon" className={selectIconVariants()}>
        <Icon name="codicon:chevron-down" size={14} />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

/** The selected item's label (or the placeholder). */
export function SelectValue({ className, ...props }: SelectValueProps) {
  return (
    <BaseSelect.Value
      data-slot="select-value"
      className={cn(selectValueVariants(), className)}
      {...props}
    />
  );
}
