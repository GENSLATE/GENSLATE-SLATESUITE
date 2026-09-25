import type { Menu as BaseMenu } from '@base-ui/react/menu';
import type { ReactNode } from 'react';
import type { Platform } from '../../../utils/platform.util';
import type { CodiconRef } from '../../display/icon/icon.types';

export interface MenuProps extends BaseMenu.Root.Props {}

export interface MenuTriggerProps extends Omit<BaseMenu.Trigger.Props, 'className'> {
  className?: string | undefined;
}

export interface MenuPopupProps extends Omit<BaseMenu.Popup.Props, 'className'> {
  side?: BaseMenu.Positioner.Props['side'] | undefined;
  align?: BaseMenu.Positioner.Props['align'] | undefined;
  sideOffset?: number | undefined;
  alignOffset?: number | undefined;
  /** Translucent macOS material. */
  glass?: boolean | undefined;
  className?: string | undefined;
}

/** Shared content props of every menu row. */
export interface MenuRowContentProps {
  /** Leading codicon. */
  icon?: CodiconRef | undefined;
  /** Keyboard shortcut hint, e.g. `"mod+shift+p"`. */
  shortcut?: string | undefined;
  /** Platform used to format `shortcut` (defaults to a user-agent guess). */
  platform?: Platform | undefined;
}

export interface MenuItemProps extends MenuRowContentProps, Omit<BaseMenu.Item.Props, 'className'> {
  /** `danger` for destructive commands (red when highlighted). */
  tone?: 'default' | 'danger' | undefined;
  /** Reserve the leading check column so the label aligns with checkbox/radio items. */
  inset?: boolean | undefined;
  className?: string | undefined;
}

export interface MenuCheckboxItemProps
  extends MenuRowContentProps,
    Omit<BaseMenu.CheckboxItem.Props, 'className'> {
  className?: string | undefined;
}

export interface MenuRadioGroupProps extends Omit<BaseMenu.RadioGroup.Props, 'className'> {
  className?: string | undefined;
}

export interface MenuRadioItemProps
  extends MenuRowContentProps,
    Omit<BaseMenu.RadioItem.Props, 'className'> {
  className?: string | undefined;
}

export interface MenuGroupProps extends Omit<BaseMenu.Group.Props, 'className'> {
  className?: string | undefined;
}

export interface MenuGroupLabelProps extends Omit<BaseMenu.GroupLabel.Props, 'className'> {
  /** Align with inset rows. */
  inset?: boolean | undefined;
  className?: string | undefined;
}

export interface MenuSeparatorProps extends Omit<BaseMenu.Separator.Props, 'className'> {
  className?: string | undefined;
}

export interface MenuSubmenuRootProps extends BaseMenu.SubmenuRoot.Props {}

export interface MenuSubmenuTriggerProps extends Omit<BaseMenu.SubmenuTrigger.Props, 'className'> {
  icon?: CodiconRef | undefined;
  inset?: boolean | undefined;
  className?: string | undefined;
}

export interface MenuShortcutProps {
  shortcut: string;
  platform?: Platform | undefined;
  className?: string | undefined;
  children?: ReactNode | undefined;
}
