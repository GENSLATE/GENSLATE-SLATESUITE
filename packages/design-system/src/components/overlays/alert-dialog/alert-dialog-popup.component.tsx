import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import { dialogVariants } from '../dialog/dialog.variants';
import type { AlertDialogPopupProps } from './alert-dialog.types';
import { alertDialogVariants } from './alert-dialog.variants';

/** Scrim + centred sheet with an optional leading status glyph. */
export function AlertDialogPopup({
  tone = 'default',
  icon,
  size = 'sm',
  className,
  children,
  ...props
}: AlertDialogPopupProps) {
  const dialog = dialogVariants({ size });
  const styles = alertDialogVariants({ tone });
  const glyph = icon === undefined ? (tone === 'danger' ? 'codicon:warning' : null) : icon;
  return (
    <BaseAlertDialog.Portal>
      <BaseAlertDialog.Backdrop data-slot="alert-dialog-backdrop" className={dialog.backdrop()} />
      <BaseAlertDialog.Viewport data-slot="alert-dialog-viewport" className={dialog.viewport()}>
        <BaseAlertDialog.Popup
          data-slot="alert-dialog-popup"
          data-tone={tone}
          className={cn(dialog.popup(), className)}
          {...props}
        >
          {glyph == null ? (
            children
          ) : (
            <div className={styles.layout()}>
              <span data-slot="alert-dialog-icon" className={styles.icon()}>
                <Icon name={glyph} size={20} />
              </span>
              <div className={styles.content()}>{children}</div>
            </div>
          )}
        </BaseAlertDialog.Popup>
      </BaseAlertDialog.Viewport>
    </BaseAlertDialog.Portal>
  );
}
