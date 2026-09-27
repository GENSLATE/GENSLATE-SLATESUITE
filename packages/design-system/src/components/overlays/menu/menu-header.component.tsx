import { cn } from '../../../utils/cn.util';
import type { MenuHeaderProps } from './menu.types';
import { menuVariants } from './menu.variants';

const styles = menuVariants();

/**
 * A non-interactive identity row at the top of a menu: mark, title, one muted line and an
 * optional accessory (a badge). Used by tray and account menus; follow it with a
 * `MenuSeparator`. Keyboard navigation skips it.
 */
export function MenuHeader({
  media,
  title,
  description,
  accessory,
  className,
  ...props
}: MenuHeaderProps) {
  return (
    <div data-slot="menu-header" className={cn(styles.header(), className)} {...props}>
      {media != null && (
        <span data-slot="menu-header-media" aria-hidden className={styles.headerMedia()}>
          {media}
        </span>
      )}
      <span className={styles.headerText()}>
        <span data-slot="menu-header-title" className={styles.headerTitle()}>
          {title}
        </span>
        {description != null && (
          <span data-slot="menu-header-description" className={styles.headerDescription()}>
            {description}
          </span>
        )}
      </span>
      {accessory != null && (
        <span data-slot="menu-header-accessory" className={styles.headerAccessory()}>
          {accessory}
        </span>
      )}
    </div>
  );
}
