import { cn } from '../../../utils/cn.util';
import { renderIconSlot } from '../../display/icon/icon.slot';
import type { EmptyStateProps } from './empty-state.types';
import { emptyStateVariants } from './empty-state.variants';

/** What to show when there is nothing to show: glyph, title, one sentence, and a way forward. */
export function EmptyState({
  icon,
  title,
  description,
  actions,
  size = 'md',
  className,
  children,
  ...props
}: EmptyStateProps) {
  const styles = emptyStateVariants({ size });
  return (
    <div data-slot="empty-state" className={cn(styles.root(), className)} {...props}>
      {icon != null && (
        <div data-slot="empty-state-icon" aria-hidden className={styles.icon()}>
          {renderIconSlot(icon, size === 'sm' ? 16 : 20)}
        </div>
      )}
      <div className="flex flex-col items-center gap-1">
        <p data-slot="empty-state-title" className={styles.title()}>
          {title}
        </p>
        {description != null && (
          <p data-slot="empty-state-description" className={styles.description()}>
            {description}
          </p>
        )}
      </div>
      {children}
      {actions != null && (
        <div data-slot="empty-state-actions" className={styles.actions()}>
          {actions}
        </div>
      )}
    </div>
  );
}
