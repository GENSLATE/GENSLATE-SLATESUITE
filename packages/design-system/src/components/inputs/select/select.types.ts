import type { Select as BaseSelect } from '@base-ui/react/select';
import type { ReactNode } from 'react';
import type { CodiconRef } from '../../display/icon/icon.types';
import type { FieldSlotProps } from '../field/field.types';

export type SelectSize = 'sm' | 'md' | 'lg';

/** One option of the simple `options` API. */
export interface SelectOption<Value = string> {
  value: Value;
  label: string;
  icon?: CodiconRef | undefined;
  disabled?: boolean | undefined;
  /** Options sharing a `group` are rendered under a group label, in first-seen order. */
  group?: string | undefined;
}

export interface SelectProps<Value = string>
  extends FieldSlotProps,
    Omit<BaseSelect.Root.Props<Value, false>, 'onValueChange' | 'multiple' | 'children'> {
  /** Simple API: render the trigger and popup from a flat list. Omit to compose parts as children. */
  options?: readonly SelectOption<Value>[] | undefined;
  /** Called with the chosen value. */
  onValueChange?: ((value: Value | null) => void) | undefined;
  /** Placeholder for the simple API's trigger. */
  placeholder?: ReactNode | undefined;
  /** Trigger size for the simple API. */
  size?: SelectSize | undefined;
  /** Compound API: `SelectTrigger` + `SelectPopup` (+ items). */
  children?: ReactNode | undefined;
  /** Class on the outer field stack. */
  className?: string | undefined;
  /** Class on the simple API's trigger. */
  triggerClassName?: string | undefined;
}

export interface SelectTriggerProps extends Omit<BaseSelect.Trigger.Props, 'className'> {
  size?: SelectSize | undefined;
  /** Shorthand: renders `<SelectValue placeholder={…} />` when no children are given. */
  placeholder?: ReactNode | undefined;
  className?: string | undefined;
}

export interface SelectValueProps extends Omit<BaseSelect.Value.Props, 'className'> {
  className?: string | undefined;
}

export interface SelectPopupProps extends Omit<BaseSelect.Popup.Props, 'className'> {
  /** Overlay the selected item on the trigger, like a macOS pop-up button (default true). */
  alignItemWithTrigger?: boolean | undefined;
  side?: BaseSelect.Positioner.Props['side'] | undefined;
  align?: BaseSelect.Positioner.Props['align'] | undefined;
  sideOffset?: number | undefined;
  className?: string | undefined;
}

export interface SelectItemProps extends Omit<BaseSelect.Item.Props, 'className'> {
  icon?: CodiconRef | undefined;
  className?: string | undefined;
}

export interface SelectGroupProps extends Omit<BaseSelect.Group.Props, 'className'> {
  className?: string | undefined;
}

export interface SelectGroupLabelProps extends Omit<BaseSelect.GroupLabel.Props, 'className'> {
  className?: string | undefined;
}

export interface SelectSeparatorProps extends Omit<BaseSelect.Separator.Props, 'className'> {
  className?: string | undefined;
}
