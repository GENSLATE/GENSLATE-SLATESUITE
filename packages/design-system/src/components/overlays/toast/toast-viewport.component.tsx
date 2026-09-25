import { Toast as BaseToast } from '@base-ui/react/toast';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { CodiconRef } from '../../display/icon/icon.types';
import type { ToastType, ToastViewportProps } from './toast.types';
import { toastVariants } from './toast.variants';

const ICONS: Readonly<Record<ToastType, CodiconRef>> = {
  info: 'codicon:info',
  success: 'codicon:pass-filled',
  warning: 'codicon:warning',
  error: 'codicon:error',
};

const isToastType = (type: string | undefined): type is ToastType => type != null && type in ICONS;

/** The stack of toasts, bottom-right above the status bar. Expands on hover/focus. */
export function ToastViewport({ className, labels }: ToastViewportProps) {
  const { toasts } = BaseToast.useToastManager();
  return (
    <BaseToast.Portal>
      <BaseToast.Viewport
        data-slot="toast-viewport"
        aria-label={labels?.region ?? 'Notifications'}
        className={cn(toastVariants().viewport(), className)}
      >
        {toasts.map((toast) => {
          const type = isToastType(toast.type) ? toast.type : undefined;
          const styles = toastVariants({ type: type ?? 'none' });
          return (
            <BaseToast.Root
              key={toast.id}
              toast={toast}
              data-slot="toast"
              className={styles.root()}
            >
              <BaseToast.Content className={styles.content()}>
                {type != null && <Icon name={ICONS[type]} size={16} className={styles.icon()} />}
                <div className={styles.text()}>
                  <BaseToast.Title data-slot="toast-title" className={styles.title()} />
                  <BaseToast.Description
                    data-slot="toast-description"
                    className={styles.description()}
                  />
                  {toast.actionProps != null && (
                    <BaseToast.Action data-slot="toast-action" className={styles.action()} />
                  )}
                </div>
                <BaseToast.Close
                  data-slot="toast-close"
                  aria-label={labels?.close ?? 'Close'}
                  className={styles.close()}
                >
                  <Icon name="codicon:close" size={14} />
                </BaseToast.Close>
              </BaseToast.Content>
            </BaseToast.Root>
          );
        })}
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
}
