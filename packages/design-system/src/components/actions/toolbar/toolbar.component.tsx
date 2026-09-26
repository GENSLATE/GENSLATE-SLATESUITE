import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import { cn } from '../../../utils/cn.util';
import { Button } from '../button/button.component';
import { IconButton } from '../icon-button/icon-button.component';
import type {
  ToolbarButtonProps,
  ToolbarGroupProps,
  ToolbarProps,
  ToolbarSeparatorProps,
  ToolbarSpacerProps,
  ToolbarTextButtonProps,
} from './toolbar.types';
import { toolbarVariants } from './toolbar.variants';

/** A row of controls with one tab stop and arrow-key roving focus (Base UI Toolbar). */
export function Toolbar({ variant = 'inline', className, ...props }: ToolbarProps) {
  return (
    <BaseToolbar.Root
      data-slot="toolbar"
      className={cn(toolbarVariants({ variant }).root(), className)}
      {...props}
    />
  );
}

export function ToolbarGroup({ className, ...props }: ToolbarGroupProps) {
  return (
    <BaseToolbar.Group
      data-slot="toolbar-group"
      className={cn(toolbarVariants().group(), className)}
      {...props}
    />
  );
}

export function ToolbarSeparator({ className, ...props }: ToolbarSeparatorProps) {
  return (
    <BaseToolbar.Separator
      data-slot="toolbar-separator"
      className={cn(toolbarVariants().separator(), className)}
      {...props}
    />
  );
}

/** An `IconButton` inside a toolbar. */
export function ToolbarButton({ disabled, size = 'sm', ...props }: ToolbarButtonProps) {
  return <BaseToolbar.Button disabled={disabled} render={<IconButton size={size} {...props} />} />;
}

/** A text `Button` inside a toolbar. */
export function ToolbarTextButton({
  disabled,
  variant = 'ghost',
  size = 'sm',
  ...props
}: ToolbarTextButtonProps) {
  return (
    <BaseToolbar.Button
      disabled={disabled}
      render={<Button variant={variant} size={size} {...props} />}
    />
  );
}

/** Pushes the following items to the far end. */
export function ToolbarSpacer({ className, ...props }: ToolbarSpacerProps) {
  return (
    <div
      data-slot="toolbar-spacer"
      aria-hidden
      className={cn(toolbarVariants().spacer(), className)}
      {...props}
    />
  );
}
