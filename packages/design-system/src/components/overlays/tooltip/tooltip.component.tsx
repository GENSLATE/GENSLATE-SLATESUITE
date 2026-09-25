import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { cn } from '../../../utils/cn.util';
import { guessPlatform } from '../../../utils/platform.util';
import { formatShortcut } from '../../../utils/shortcut.util';
import type { TooltipProps, TooltipProviderProps } from './tooltip.types';
import { tooltipVariants } from './tooltip.variants';

/**
 * Groups tooltips so moving between triggers shows the next one instantly (after the first
 * 600ms delay), like macOS toolbars.
 */
export function TooltipProvider({
  delay = 600,
  closeDelay = 0,
  timeout = 400,
  ...props
}: TooltipProviderProps) {
  return (
    <BaseTooltip.Provider delay={delay} closeDelay={closeDelay} timeout={timeout} {...props} />
  );
}

/** A small, dark label for a control; optional shortcut hint. Wrap exactly one trigger element. */
export function Tooltip({
  content,
  shortcut,
  platform,
  children,
  side = 'bottom',
  align = 'center',
  sideOffset = 6,
  delay,
  className,
  ...rootProps
}: TooltipProps) {
  const styles = tooltipVariants();
  return (
    <BaseTooltip.Root {...rootProps}>
      <BaseTooltip.Trigger render={children} delay={delay} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={6}
          className={styles.positioner()}
        >
          <BaseTooltip.Popup data-slot="tooltip" className={cn(styles.popup(), className)}>
            <span>{content}</span>
            {shortcut != null && (
              <kbd data-slot="tooltip-shortcut" className={styles.shortcut()}>
                {formatShortcut(shortcut, platform ?? guessPlatform())}
              </kbd>
            )}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
