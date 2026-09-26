import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';
import { useId } from 'react';
import { cn } from '../../../utils/cn.util';
import type { CheckboxGroupProps } from './checkbox-group.types';
import { choiceGroupVariants } from './checkbox-group.variants';

/**
 * Shared state for a set of `<Checkbox value="…" />`. Pass `allValues` and a
 * `<Checkbox parent />` to get a select-all box with a mixed state.
 */
export function CheckboxGroup({
  label,
  description,
  orientation = 'vertical',
  onValueChange,
  className,
  children,
  ...props
}: CheckboxGroupProps) {
  const id = useId();
  const styles = choiceGroupVariants({ orientation });
  return (
    <div data-slot="checkbox-group" className={cn(styles.root(), className)}>
      {label != null && (
        <div id={`${id}-label`} data-slot="checkbox-group-label" className={styles.label()}>
          {label}
        </div>
      )}
      {description != null && (
        <div
          id={`${id}-description`}
          data-slot="checkbox-group-description"
          className={styles.description()}
        >
          {description}
        </div>
      )}
      <BaseCheckboxGroup
        data-slot="checkbox-group-items"
        aria-labelledby={label != null ? `${id}-label` : undefined}
        aria-describedby={description != null ? `${id}-description` : undefined}
        onValueChange={(value) => onValueChange?.(value)}
        className={styles.items()}
        {...props}
      >
        {children}
      </BaseCheckboxGroup>
    </div>
  );
}
