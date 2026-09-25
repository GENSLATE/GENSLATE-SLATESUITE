import { Toast as BaseToast } from '@base-ui/react/toast';
import type { ToastProviderProps } from './toast.types';

/** Holds the toast queue. Render one `ToastViewport` inside it; call `useToast().add(…)`. */
export function ToastProvider({ timeout = 5000, limit = 3, ...props }: ToastProviderProps) {
  return <BaseToast.Provider timeout={timeout} limit={limit} {...props} />;
}

/**
 * Base UI's toast manager: `add({ title, description, type: 'success' })`, `close(id)`,
 * `update(id, …)`, `promise(…)` and the current `toasts`.
 */
export const useToast = BaseToast.useToastManager;
