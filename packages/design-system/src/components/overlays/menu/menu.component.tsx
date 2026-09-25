import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { MenuProps, MenuTriggerProps } from './menu.types';

/** A dropdown menu (Base UI `Menu.Root`). Compose `MenuTrigger` + `MenuPopup` + items. */
export function Menu(props: MenuProps) {
  return <BaseMenu.Root {...props} />;
}

/** Opens the menu. Use `render` to supply your own button. */
export function MenuTrigger({ className, ...props }: MenuTriggerProps) {
  return <BaseMenu.Trigger data-slot="menu-trigger" className={className} {...props} />;
}
