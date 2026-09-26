import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
import { cn } from '../../../utils/cn.util';
import type { ContextMenuProps, ContextMenuTriggerProps } from './context-menu.types';
import { contextMenuVariants } from './context-menu.variants';

const styles = contextMenuVariants();

/**
 * A right-click (or long-press) menu. Items are the `Menu*` parts — `MenuItem`,
 * `MenuCheckboxItem`, `MenuSeparator`, … — also exported as `ContextMenu*` aliases.
 */
export function ContextMenu(props: ContextMenuProps) {
  return <BaseContextMenu.Root {...props} />;
}

/** The area that opens the menu on right-click. */
export function ContextMenuTrigger({ className, ...props }: ContextMenuTriggerProps) {
  return (
    <BaseContextMenu.Trigger
      data-slot="context-menu-trigger"
      className={cn(styles.trigger(), className)}
      {...props}
    />
  );
}
