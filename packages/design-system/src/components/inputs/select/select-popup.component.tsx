import { Select as BaseSelect } from '@base-ui/react/select';
import { popupSurface } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { SelectPopupProps } from './select.types';
import {
  selectListVariants,
  selectPopupVariants,
  selectPositionerVariants,
  selectScrollArrowVariants,
} from './select.variants';

/** The floating list (Portal → Positioner → Popup → List) with scroll arrows. */
export function SelectPopup({
  alignItemWithTrigger = true,
  side,
  align,
  sideOffset = 4,
  className,
  children,
  ...props
}: SelectPopupProps) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        data-slot="select-positioner"
        alignItemWithTrigger={alignItemWithTrigger}
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={selectPositionerVariants()}
      >
        <BaseSelect.Popup
          data-slot="select-popup"
          className={cn(popupSurface({ size: 'menu' }), selectPopupVariants(), className)}
          {...props}
        >
          <BaseSelect.ScrollUpArrow
            data-slot="select-scroll-up"
            className={selectScrollArrowVariants()}
          >
            <Icon name="codicon:chevron-up" size={12} />
          </BaseSelect.ScrollUpArrow>
          <BaseSelect.List data-slot="select-list" className={selectListVariants()}>
            {children}
          </BaseSelect.List>
          <BaseSelect.ScrollDownArrow
            data-slot="select-scroll-down"
            className={selectScrollArrowVariants()}
          >
            <Icon name="codicon:chevron-down" size={12} />
          </BaseSelect.ScrollDownArrow>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}
