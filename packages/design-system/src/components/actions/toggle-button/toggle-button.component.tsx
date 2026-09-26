import { Toggle } from '@base-ui/react/toggle';
import { cn } from '../../../utils/cn.util';
import { renderIconSlot } from '../../display/icon/icon.slot';
import { BUTTON_ICON_SIZE } from '../button/button.component';
import type { ToggleButtonProps } from './toggle-button.types';
import { toggleButtonVariants } from './toggle-button.variants';

/** A two-state button (Base UI Toggle): `aria-pressed` + `data-pressed`. Works alone or in a `ToggleGroup`. */
export function ToggleButton<Value extends string = string>({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  className,
  children,
  ...props
}: ToggleButtonProps<Value>) {
  const iconOnly = children == null && icon != null;
  return (
    <Toggle<Value>
      data-slot="toggle-button"
      aria-label={iconOnly ? label : undefined}
      title={label}
      className={cn(toggleButtonVariants({ variant, size, iconOnly }), className)}
      {...props}
    >
      {icon != null && renderIconSlot(icon, BUTTON_ICON_SIZE[size])}
      {children}
    </Toggle>
  );
}
