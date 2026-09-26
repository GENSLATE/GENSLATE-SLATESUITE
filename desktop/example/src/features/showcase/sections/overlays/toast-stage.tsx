import { ToastProvider, ToastViewport } from '@genslate/design-system';
import type { ReactNode } from 'react';

/**
 * Local toast host for the showcase pages. (An app mounts one `ToastProvider` + `ToastViewport`
 * near its root; the example app shell doesn't yet, so these pages bring their own.)
 */
export function ToastStage({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastViewport />
    </ToastProvider>
  );
}
