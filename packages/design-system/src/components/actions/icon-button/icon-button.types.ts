import type { Button as BaseButton } from '@base-ui/react/button';
import type { IconSlot } from '../../display/icon/icon.slot';
import type { ButtonSize } from '../button/button.types';

export type IconButtonVariant = 'ghost' | 'secondary' | 'primary' | 'danger';

export interface IconButtonProps
  extends Omit<BaseButton.Props, 'className' | 'children' | 'aria-label'> {
  /** Accessible name — required; also shown as the native tooltip. */
  label: string;
  /** The glyph: a codicon ref or an element. */
  icon: IconSlot;
  /** @default 'ghost' */
  variant?: IconButtonVariant | undefined;
  /** xs 20 · sm 24 · md 28 · lg 32. @default 'md' */
  size?: ButtonSize | undefined;
  /** Makes it a toggle: sets `aria-pressed` and the accent-tinted "on" look. */
  toggled?: boolean | undefined;
  /** Shows a spinner in place of the icon. */
  loading?: boolean | undefined;
  /** Tooltip text. `false` disables the native `title`. @default label */
  tooltip?: string | false | undefined;
  className?: string | undefined;
}
