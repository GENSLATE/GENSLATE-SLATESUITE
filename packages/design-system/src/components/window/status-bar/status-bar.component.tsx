import { cn } from '../../../utils/cn.util';
import { renderIconSlot } from '../../display/icon/icon.slot';
import type { StatusBarItemProps, StatusBarProps, StatusBarSectionProps } from './status-bar.types';
import { statusBarVariants } from './status-bar.variants';

/** The window's bottom status bar (a `contentinfo` landmark). */
export function StatusBar({
  className,
  'aria-label': ariaLabel = 'Status bar',
  ...props
}: StatusBarProps) {
  return (
    <footer
      data-slot="statusbar"
      role="contentinfo"
      aria-label={ariaLabel}
      className={cn(statusBarVariants().root(), className)}
      {...props}
    />
  );
}

export function StatusBarSection({ align = 'start', className, ...props }: StatusBarSectionProps) {
  return (
    <div
      data-slot="statusbar-section"
      data-align={align}
      className={cn(statusBarVariants({ align }).section(), className)}
      {...props}
    />
  );
}

/** A status item: a button when it has `onClick`, otherwise static text. */
export function StatusBarItem({
  icon,
  children,
  label,
  accent = false,
  interactive,
  className,
  onClick,
  type = 'button',
  ...props
}: StatusBarItemProps) {
  const isButton = interactive ?? onClick !== undefined;
  const styles = statusBarVariants({ accent, interactive: isButton });
  const iconOnly = children == null;
  const content = (
    <>
      {icon != null && renderIconSlot(icon, 14)}
      {children != null && <span className={styles.label()}>{children}</span>}
    </>
  );

  if (!isButton) {
    return (
      // biome-ignore lint/a11y/useAriaPropsSupportedByRole: icon-only static items get role="img" with the label
      <span
        data-slot="statusbar-item"
        data-accent={accent || undefined}
        title={label}
        aria-label={iconOnly ? label : undefined}
        role={iconOnly && label ? 'img' : undefined}
        className={cn(styles.item(), className)}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      data-slot="statusbar-item"
      data-accent={accent || undefined}
      type={type}
      title={label}
      aria-label={iconOnly ? label : undefined}
      onClick={onClick}
      className={cn(styles.item(), className)}
      {...props}
    >
      {content}
    </button>
  );
}
