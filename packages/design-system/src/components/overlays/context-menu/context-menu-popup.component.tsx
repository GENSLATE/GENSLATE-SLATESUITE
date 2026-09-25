import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
import { popupSurface } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import type { ContextMenuPopupProps } from './context-menu.types';
import { contextMenuVariants } from './context-menu.variants';

const styles = contextMenuVariants();

/** Portal → Positioner (at the pointer) → Popup with the macOS menu surface. */
export function ContextMenuPopup({ glass = false, className, ...props }: ContextMenuPopupProps) {
  return (
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner collisionPadding={8} className={styles.positioner()}>
        <BaseContextMenu.Popup
          data-slot="context-menu-popup"
          className={cn(popupSurface({ size: 'menu', glass }), styles.popup(), className)}
          {...props}
        />
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  );
}
