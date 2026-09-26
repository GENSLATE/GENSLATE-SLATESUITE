import { Menu as BaseMenu } from '@base-ui/react/menu';
import { listItem } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { MenuSubmenuRootProps, MenuSubmenuTriggerProps } from './menu.types';
import { menuVariants } from './menu.variants';
import { MenuSubmenuContext } from './menu-context';

const styles = menuVariants();

/** A nested menu: `MenuSubmenuTrigger` + a `MenuPopup`. */
export function MenuSubmenuRoot(props: MenuSubmenuRootProps) {
  return (
    <MenuSubmenuContext value={true}>
      <BaseMenu.SubmenuRoot {...props} />
    </MenuSubmenuContext>
  );
}

/** The row that opens a submenu (hover, → or Enter), with a trailing chevron. */
export function MenuSubmenuTrigger({
  icon,
  inset = false,
  className,
  children,
  ...props
}: MenuSubmenuTriggerProps) {
  return (
    <BaseMenu.SubmenuTrigger
      data-slot="menu-submenu-trigger"
      className={cn(listItem({ inset }), styles.submenuTrigger(), className)}
      {...props}
    >
      {icon != null && <Icon name={icon} size={16} className={styles.icon()} />}
      <span className={styles.label()}>{children}</span>
      <Icon name="codicon:chevron-right" size={14} className={styles.chevron()} />
    </BaseMenu.SubmenuTrigger>
  );
}
