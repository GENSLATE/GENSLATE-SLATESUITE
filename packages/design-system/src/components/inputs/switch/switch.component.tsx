import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cn } from '../../../utils/cn.util';
import type { SwitchProps } from './switch.types';
import {
  switchDescriptionVariants,
  switchLabelVariants,
  switchTextVariants,
  switchThumbVariants,
  switchTrackVariants,
} from './switch.variants';

/** A macOS-style toggle: 28×16 track, springy thumb, accent track when on. */
export function Switch({
  label,
  description,
  labelPosition = 'start',
  size = 'md',
  onCheckedChange,
  className,
  ...props
}: SwitchProps) {
  const hasText = label != null || description != null;
  const control = (
    <BaseSwitch.Root
      data-slot="switch"
      onCheckedChange={(checked) => onCheckedChange?.(checked)}
      className={cn(switchTrackVariants({ size }), !hasText && className)}
      {...props}
    >
      <BaseSwitch.Thumb data-slot="switch-thumb" className={switchThumbVariants({ size })} />
    </BaseSwitch.Root>
  );

  if (!hasText) return control;

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Base UI's switch root is the labelled control.
    <label
      data-slot="switch-label"
      className={cn(switchLabelVariants({ labelPosition }), className)}
    >
      <span data-slot="switch-text" className={switchTextVariants()}>
        {label != null && <span>{label}</span>}
        {description != null && (
          <span data-slot="switch-description" className={switchDescriptionVariants()}>
            {description}
          </span>
        )}
      </span>
      {control}
    </label>
  );
}
