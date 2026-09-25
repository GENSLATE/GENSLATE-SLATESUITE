import { Popover as BasePopover } from '@base-ui/react/popover';
import { popupSurface } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import type { PopoverPopupProps } from './popover.types';
import { popoverVariants } from './popover.variants';

const styles = popoverVariants();

/** Portal → Positioner → Popup, with the macOS floating-surface recipe. */
export function PopoverPopup({
  side = 'bottom',
  align = 'center',
  sideOffset = 6,
  arrow = false,
  glass = false,
  className,
  children,
  ...props
}: PopoverPopupProps) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        side={side}
        align={align}
        sideOffset={arrow ? sideOffset + 4 : sideOffset}
        collisionPadding={8}
        className={styles.positioner()}
      >
        <BasePopover.Popup
          data-slot="popover-popup"
          className={cn(popupSurface({ size: 'popover', glass }), styles.popup(), className)}
          {...props}
        >
          {arrow && <BasePopover.Arrow data-slot="popover-arrow" className={styles.arrow()} />}
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}
