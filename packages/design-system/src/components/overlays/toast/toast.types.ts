import type { Toast as BaseToast } from '@base-ui/react/toast';

/** Status of a toast; picks its icon and accent. */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastProviderProps extends BaseToast.Provider.Props {}

export interface ToastLabels {
  /** Accessible name of each toast's close button. */
  close?: string | undefined;
  /** Accessible name of the notifications region. */
  region?: string | undefined;
}

export interface ToastViewportProps {
  className?: string | undefined;
  labels?: ToastLabels | undefined;
}
