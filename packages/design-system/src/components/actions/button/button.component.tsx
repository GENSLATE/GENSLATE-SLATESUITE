import { Button as BaseButton } from '@base-ui/react/button';
import { cn } from '../../../utils/cn.util';
import { renderIconSlot } from '../../display/icon/icon.slot';
import type { IconSize } from '../../display/icon/icon.types';
import { Spinner } from '../../feedback/spinner/spinner.component';
import type { ButtonProps, ButtonSize } from './button.types';
import { buttonVariants } from './button.variants';

export const BUTTON_ICON_SIZE: Readonly<Record<ButtonSize, IconSize>> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 16,
};

/**
 * The push button. `secondary` (default) · `primary` (the one accent action) · `ghost` · `danger` · `link`.
 * `loading` keeps the width, shows a spinner, sets `aria-busy` and blocks activation while staying focusable.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  disabled = false,
  className,
  children,
  labels,
  focusableWhenDisabled = false,
  ...props
}: ButtonProps) {
  const styles = buttonVariants({ variant, size, fullWidth, loading });
  const iconSize = BUTTON_ICON_SIZE[size];

  return (
    <BaseButton
      data-slot="button"
      data-variant={variant}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      focusableWhenDisabled={loading || focusableWhenDisabled}
      className={cn(styles.root(), loading && 'data-disabled:opacity-100', className)}
      {...props}
    >
      <span data-slot="button-content" className={styles.content()}>
        {leadingIcon != null && renderIconSlot(leadingIcon, iconSize)}
        {children}
        {trailingIcon != null && renderIconSlot(trailingIcon, iconSize)}
      </span>
      {loading && (
        <Spinner
          data-slot="button-spinner"
          className={styles.spinner()}
          size={iconSize === 12 ? 12 : 14}
          label={labels?.loading ?? 'Loading'}
          decorative
        />
      )}
    </BaseButton>
  );
}
