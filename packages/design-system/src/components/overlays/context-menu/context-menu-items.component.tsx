import { MenuCheckboxItem } from '../menu/menu-checkbox-item.component';
import { MenuGroup, MenuGroupLabel } from '../menu/menu-group.component';
import { MenuItem } from '../menu/menu-item.component';
import { MenuRadioGroup, MenuRadioItem } from '../menu/menu-radio-item.component';
import { MenuSeparator } from '../menu/menu-separator.component';
import { MenuSubmenuRoot, MenuSubmenuTrigger } from '../menu/menu-submenu.component';

// Base UI's ContextMenu parts *are* the Menu parts, so the styled Menu rows are reused as-is.
export const ContextMenuItem = MenuItem;
export const ContextMenuCheckboxItem = MenuCheckboxItem;
export const ContextMenuRadioGroup = MenuRadioGroup;
export const ContextMenuRadioItem = MenuRadioItem;
export const ContextMenuGroup = MenuGroup;
export const ContextMenuGroupLabel = MenuGroupLabel;
export const ContextMenuSeparator = MenuSeparator;
export const ContextMenuSubmenuRoot = MenuSubmenuRoot;
export const ContextMenuSubmenuTrigger = MenuSubmenuTrigger;
