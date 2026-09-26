import { cn } from '../../../utils/cn.util';
import { IconButton } from '../../actions/icon-button/icon-button.component';
import { renderIconSlot } from '../../display/icon/icon.slot';
import type { CodiconRef } from '../../display/icon/icon.types';
import type { BannerProps, BannerTone } from './banner.types';
import { bannerVariants } from './banner.variants';

const TONE_ICON: Readonly<Record<BannerTone, CodiconRef>> = {
  neutral: 'codicon:info',
  info: 'codicon:info',
  success: 'codicon:pass',
  warning: 'codicon:warning',
  danger: 'codicon:error',
};

/**
 * An inline status message (callout) with a tone icon, optional title, actions and dismiss.
 * Warnings and errors are `role="alert"`; the rest `role="status"`.
 */
export function Banner({
  tone = 'info',
  title,
  icon,
  actions,
  onDismiss,
  variant = 'inline',
  labels,
  className,
  children,
  ...props
}: BannerProps) {
  const styles = bannerVariants({ tone, variant });
  const glyph = icon === undefined ? TONE_ICON[tone] : icon;
  return (
    <div
      data-slot="banner"
      data-tone={tone}
      role={tone === 'warning' || tone === 'danger' ? 'alert' : 'status'}
      className={cn(styles.root(), className)}
      {...props}
    >
      {glyph != null && (
        <span data-slot="banner-icon" className={styles.icon()}>
          {renderIconSlot(glyph, 16)}
        </span>
      )}
      <div data-slot="banner-body" className={styles.body()}>
        {title != null && <p className={styles.title()}>{title}</p>}
        {children != null && <div className={styles.description()}>{children}</div>}
      </div>
      {actions != null && (
        <div data-slot="banner-actions" className={styles.actions()}>
          {actions}
        </div>
      )}
      {onDismiss && (
        <IconButton
          className={styles.dismiss()}
          size="sm"
          icon="codicon:close"
          label={labels?.dismiss ?? 'Dismiss'}
          onClick={onDismiss}
        />
      )}
    </div>
  );
}
