import type { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';

export interface ContextMenuProps extends BaseContextMenu.Root.Props {}

export interface ContextMenuTriggerProps extends Omit<BaseContextMenu.Trigger.Props, 'className'> {
  className?: string | undefined;
}

export interface ContextMenuPopupProps extends Omit<BaseContextMenu.Popup.Props, 'className'> {
  /** Translucent macOS material. */
  glass?: boolean | undefined;
  className?: string | undefined;
}
