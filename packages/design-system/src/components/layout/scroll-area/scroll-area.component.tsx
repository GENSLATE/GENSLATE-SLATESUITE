import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area';
import { cn } from '../../../utils/cn.util';
import type { ScrollAreaProps } from './scroll-area.types';
import { scrollAreaVariants } from './scroll-area.variants';

/** A scroll container with overlay scrollbars that appear on hover and while scrolling (Base UI ScrollArea). */
export function ScrollArea({
  orientation = 'vertical',
  scrollShadow = true,
  className,
  viewportClassName,
  viewportRef,
  children,
  'aria-label': ariaLabel,
  ...props
}: ScrollAreaProps) {
  const styles = scrollAreaVariants();
  const vertical = orientation === 'vertical' || orientation === 'both';
  const horizontal = orientation === 'horizontal' || orientation === 'both';
  return (
    <BaseScrollArea.Root
      data-slot="scroll-area"
      className={cn('group/scroll', styles.root(), className)}
      {...props}
    >
      <BaseScrollArea.Viewport
        data-slot="scroll-area-viewport"
        ref={viewportRef}
        className={cn(styles.viewport(), viewportClassName)}
        {...(ariaLabel ? { role: 'region', 'aria-label': ariaLabel, tabIndex: 0 } : {})}
      >
        {children}
      </BaseScrollArea.Viewport>
      {scrollShadow && <div aria-hidden className={styles.shadow()} />}
      {vertical && (
        <BaseScrollArea.Scrollbar
          data-slot="scroll-area-scrollbar"
          orientation="vertical"
          className={styles.scrollbar()}
        >
          <BaseScrollArea.Thumb className={styles.thumb()} />
        </BaseScrollArea.Scrollbar>
      )}
      {horizontal && (
        <BaseScrollArea.Scrollbar
          data-slot="scroll-area-scrollbar"
          orientation="horizontal"
          className={styles.scrollbar()}
        >
          <BaseScrollArea.Thumb className={styles.thumb()} />
        </BaseScrollArea.Scrollbar>
      )}
      {orientation === 'both' && <BaseScrollArea.Corner className={styles.corner()} />}
    </BaseScrollArea.Root>
  );
}
