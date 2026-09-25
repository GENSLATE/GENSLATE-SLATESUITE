import { Button as BaseButton } from '@base-ui/react/button';
import { cn } from '../../../utils/cn.util';
import { renderIconSlot } from '../../display/icon/icon.slot';
import { Spinner } from '../../feedback/spinner/spinner.component';
import { BUTTON_ICON_SIZE } from '../button/button.component';
import type { IconButtonProps } from './icon-button.types';
import { iconButtonVariants } from './icon-button.variants';

/**
 * An icon-only button. `label` is required (accessible name + native tooltip).
 * Pass `toggled` to make it a toggle button (`aria-pressed`).
 */
export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  toggled,
  loading = false,
  tooltip,
  disabled = false,
  focusableWhenDisabled = false,
  className,
  ...props
}: IconButtonProps) {
  const iconSize = BUTTON_ICON_SIZE[size];
  const title = tooltip === false ? undefined : (tooltip ?? label);

  return (
    <BaseButton
      data-slot="icon-button"
      data-variant={variant}
      data-toggled={toggled || undefined}
      aria-label={label}
      aria-pressed={toggled}
      aria-busy={loading || undefined}
      title={title}
      disabled={disabled || loading}
      focusableWhenDisabled={loading || focusableWhenDisabled}
      className={cn(iconButtonVariants({ variant, size, toggled: toggled === true }), className)}
      {...props}
    >
      {loading ? (
        <Spinner size={iconSize === 12 ? 12 : 14} decorative />
      ) : (
        renderIconSlot(icon, iconSize)
      )}
    </BaseButton>
  );
}
