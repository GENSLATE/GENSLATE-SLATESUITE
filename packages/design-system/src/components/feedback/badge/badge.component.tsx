import { cn } from '../../../utils/cn.util';
import { renderIconSlot } from '../../display/icon/icon.slot';
import type { BadgeProps } from './badge.types';
import { badgeVariants } from './badge.variants';

/** A compact label or count. Aurora tones only ever mean status. */
export function Badge({
  tone = 'neutral',
  variant = 'subtle',
  size = 'md',
  dot = false,
  icon,
  pill = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const styles = badgeVariants({ tone, variant, size, pill });
  return (
    <span data-slot="badge" data-tone={tone} className={cn(styles.root(), className)} {...props}>
      {dot && <span data-slot="badge-dot" aria-hidden className={styles.dot()} />}
      {icon != null && renderIconSlot(icon, 12)}
      {children}
    </span>
  );
}
