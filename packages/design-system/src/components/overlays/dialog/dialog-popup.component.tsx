import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { DialogPopupProps } from './dialog.types';
import { dialogVariants } from './dialog.variants';

/** Portal → scrim → centred viewport → popup, entering like a macOS sheet (drop + settle). */
export function DialogPopup({
  size = 'md',
  showClose = false,
  scrim = true,
  className,
  labels,
  children,
  ...props
}: DialogPopupProps) {
  const styles = dialogVariants({ size });
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop
        data-slot="dialog-backdrop"
        className={cn(styles.backdrop(), !scrim && 'bg-transparent')}
      />
      <BaseDialog.Viewport data-slot="dialog-viewport" className={styles.viewport()}>
        <BaseDialog.Popup
          data-slot="dialog-popup"
          className={cn(styles.popup(), className)}
          {...props}
        >
          {children}
          {showClose && (
            <BaseDialog.Close
              data-slot="dialog-close-button"
              aria-label={labels?.close ?? 'Close'}
              className={styles.close()}
            >
              <Icon name="codicon:close" size={16} />
            </BaseDialog.Close>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Viewport>
    </BaseDialog.Portal>
  );
}
