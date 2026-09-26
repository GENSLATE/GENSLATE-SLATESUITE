import { Radio as BaseRadio } from '@base-ui/react/radio';
import { cn } from '../../../utils/cn.util';
import type { RadioProps } from './radio-group.types';
import {
  radioDescriptionVariants,
  radioIndicatorVariants,
  radioLabelVariants,
  radioTextVariants,
  radioVariants,
} from './radio-group.variants';

/** One option of a `RadioGroup`. */
export function Radio<Value = string>({
  label,
  description,
  className,
  ...props
}: RadioProps<Value>) {
  const hasText = label != null || description != null;
  const dot = (
    <BaseRadio.Root<Value>
      data-slot="radio"
      className={cn(radioVariants({ withLabel: hasText }), !hasText && className)}
      {...props}
    >
      <BaseRadio.Indicator data-slot="radio-indicator" className={radioIndicatorVariants()} />
    </BaseRadio.Root>
  );
  if (!hasText) return dot;
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Base UI's radio root is the labelled control.
    <label data-slot="radio-label" className={cn(radioLabelVariants(), className)}>
      {dot}
      <span className={radioTextVariants()}>
        {label != null && <span>{label}</span>}
        {description != null && (
          <span data-slot="radio-description" className={radioDescriptionVariants()}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
