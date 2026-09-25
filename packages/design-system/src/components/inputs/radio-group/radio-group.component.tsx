import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { useId } from 'react';
import { cn } from '../../../utils/cn.util';
import { choiceGroupVariants } from '../checkbox-group/checkbox-group.variants';
import type { RadioGroupProps } from './radio-group.types';

/** A labelled set of `<Radio />`s with roving focus (arrow keys move and select). */
export function RadioGroup<Value = string>({
  label,
  description,
  orientation = 'vertical',
  onValueChange,
  className,
  children,
  ...props
}: RadioGroupProps<Value>) {
  const id = useId();
  const styles = choiceGroupVariants({ orientation });
  return (
    <div data-slot="radio-group" className={cn(styles.root(), className)}>
      {label != null && (
        <div id={`${id}-label`} data-slot="radio-group-label" className={styles.label()}>
          {label}
        </div>
      )}
      {description != null && (
        <div
          id={`${id}-description`}
          data-slot="radio-group-description"
          className={styles.description()}
        >
          {description}
        </div>
      )}
      <BaseRadioGroup<Value>
        data-slot="radio-group-items"
        aria-labelledby={label != null ? `${id}-label` : undefined}
        aria-describedby={description != null ? `${id}-description` : undefined}
        aria-orientation={orientation}
        onValueChange={(value) => onValueChange?.(value)}
        className={styles.items()}
        {...props}
      >
        {children}
      </BaseRadioGroup>
    </div>
  );
}
