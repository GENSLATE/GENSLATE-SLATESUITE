import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { CheckboxProps } from './checkbox.types';
import {
  checkboxBoxVariants,
  checkboxDescriptionVariants,
  checkboxIndicatorVariants,
  checkboxLabelVariants,
  checkboxTextVariants,
} from './checkbox.variants';

/**
 * A crisp 14px checkbox with an accent fill and a springy check. Supports `indeterminate`
 * (mixed) and an optional label + description.
 */
export function Checkbox({
  label,
  description,
  invalid,
  onCheckedChange,
  indeterminate = false,
  className,
  ...props
}: CheckboxProps) {
  const hasText = label != null || description != null;
  const box = (
    <BaseCheckbox.Root
      data-slot="checkbox"
      indeterminate={indeterminate}
      onCheckedChange={(checked) => onCheckedChange?.(checked)}
      data-invalid={invalid ? '' : undefined}
      aria-invalid={invalid ? true : undefined}
      className={cn(checkboxBoxVariants({ withLabel: hasText }), !hasText && className)}
      {...props}
    >
      <BaseCheckbox.Indicator
        data-slot="checkbox-indicator"
        className={checkboxIndicatorVariants()}
      >
        <Icon name={indeterminate ? 'codicon:dash' : 'codicon:check'} size={12} />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );

  if (!hasText) return box;

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Base UI's checkbox root is the labelled control.
    <label data-slot="checkbox-label" className={cn(checkboxLabelVariants(), className)}>
      {box}
      <span data-slot="checkbox-text" className={checkboxTextVariants()}>
        {label != null && <span>{label}</span>}
        {description != null && (
          <span data-slot="checkbox-description" className={checkboxDescriptionVariants()}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
