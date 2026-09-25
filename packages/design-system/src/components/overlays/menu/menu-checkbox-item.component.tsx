import { Menu as BaseMenu } from '@base-ui/react/menu';
import { listItem } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { MenuCheckboxItemProps } from './menu.types';
import { menuVariants } from './menu.variants';
import { MenuShortcut } from './menu-shortcut.component';

const styles = menuVariants();

/** A toggle row with a leading macOS checkmark. */
export function MenuCheckboxItem({
  icon,
  shortcut,
  platform,
  className,
  children,
  ...props
}: MenuCheckboxItemProps) {
  return (
    <BaseMenu.CheckboxItem
      data-slot="menu-checkbox-item"
      className={cn(listItem({ inset: true }), className)}
      {...props}
    >
      <BaseMenu.CheckboxItemIndicator
        data-slot="menu-checkbox-item-indicator"
        className={styles.indicator()}
      >
        <Icon name="codicon:check" size={14} />
      </BaseMenu.CheckboxItemIndicator>
      {icon != null && <Icon name={icon} size={16} className={styles.icon()} />}
      <span className={styles.label()}>{children}</span>
      {shortcut != null && <MenuShortcut shortcut={shortcut} platform={platform} />}
    </BaseMenu.CheckboxItem>
  );
}
