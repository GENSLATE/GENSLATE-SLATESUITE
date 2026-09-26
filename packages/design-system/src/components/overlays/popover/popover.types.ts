import type { Popover as BasePopover } from '@base-ui/react/popover';

export interface PopoverProps extends BasePopover.Root.Props {}

export interface PopoverTriggerProps extends Omit<BasePopover.Trigger.Props, 'className'> {
  className?: string | undefined;
}

export interface PopoverPopupProps extends Omit<BasePopover.Popup.Props, 'className'> {
  side?: BasePopover.Positioner.Props['side'] | undefined;
  align?: BasePopover.Positioner.Props['align'] | undefined;
  sideOffset?: number | undefined;
  /** Draw a small arrow pointing at the trigger. */
  arrow?: boolean | undefined;
  /** Translucent macOS material. */
  glass?: boolean | undefined;
  className?: string | undefined;
}

export interface PopoverTitleProps extends Omit<BasePopover.Title.Props, 'className'> {
  className?: string | undefined;
}

export interface PopoverDescriptionProps extends Omit<BasePopover.Description.Props, 'className'> {
  className?: string | undefined;
}

export interface PopoverCloseProps extends Omit<BasePopover.Close.Props, 'className'> {
  className?: string | undefined;
}
