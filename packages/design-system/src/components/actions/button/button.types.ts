import type { Button as BaseButton } from '@base-ui/react/button';
import type { IconSlot } from '../../display/icon/icon.slot';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<BaseButton.Props, 'className'> {
  /** @default 'secondary' */
  variant?: ButtonVariant | undefined;
  /** xs 20 · sm 24 · md 28 · lg 32. @default 'md' */
  size?: ButtonSize | undefined;
  /** Shows a spinner in place of the content, keeps the width, blocks activation (stays focusable). */
  loading?: boolean | undefined;
  /** Icon before the label: a codicon ref or an element. */
  leadingIcon?: IconSlot | undefined;
  /** Icon after the label (e.g. `codicon:chevron-down`). */
  trailingIcon?: IconSlot | undefined;
  /** Stretch to the container width. */
  fullWidth?: boolean | undefined;
  className?: string | undefined;
  labels?: { loading?: string } | undefined;
}
