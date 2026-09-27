import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { CodiconRef } from '../../display/icon/icon.types';
import { menuVariants } from './menu.variants';

const styles = menuVariants();

/** The leading 16px slot of a menu row: custom `media` (an app icon) or a codicon. */
export function MenuRowLeading({
  icon,
  media,
  className,
}: {
  icon?: CodiconRef | undefined;
  media?: ReactNode | undefined;
  className?: string | undefined;
}) {
  if (media != null) {
    return (
      <span data-slot="menu-item-media" aria-hidden className={styles.media()}>
        {media}
      </span>
    );
  }
  if (icon == null) return null;
  return <Icon name={icon} size={16} className={cn(styles.icon(), className)} />;
}
