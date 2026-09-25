import { Menu as BaseMenu } from '@base-ui/react/menu';
import { listItem } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { MenuItemProps } from './menu.types';
import { menuVariants } from './menu.variants';
import { MenuShortcut } from './menu-shortcut.component';

const styles = menuVariants();

/** A command row: optional icon, label, shortcut hint. `tone="danger"` for destructive commands. */
export function MenuItem({
  icon,
  shortcut,
  platform,
  tone = 'default',
  inset = false,
  className,
  children,
  ...props
}: MenuItemProps) {
  return (
    <BaseMenu.Item
      data-slot="menu-item"
      className={cn(listItem({ tone, inset }), className)}
      {...props}
    >
      {icon != null && (
        <Icon
          name={icon}
          size={16}
          className={cn(
            styles.icon(),
            tone === 'danger' && 'text-current group-data-highlighted/item:text-on-danger',
          )}
        />
      )}
      <span className={styles.label()}>{children}</span>
      {shortcut != null && <MenuShortcut shortcut={shortcut} platform={platform} />}
    </BaseMenu.Item>
  );
}
