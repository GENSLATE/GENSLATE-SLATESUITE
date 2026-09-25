import {
  DesignSystemProvider,
  ToastProvider,
  ToastViewport,
  TooltipProvider,
  useTheme,
} from '@genslate/design-system';
import {
  detectPlatform,
  setNativeTheme,
  useSystemTheme,
  useWindowControls,
} from '@genslate/tauri-bridge';
import { type ReactNode, useEffect, useState } from 'react';

/** Keeps the native window appearance (title bar, vibrancy, scrollbars) in step with the app theme. */
function NativeThemeSync() {
  const { theme, scheme } = useTheme();
  useEffect(() => {
    // `system` hands control back to the OS so `useSystemTheme()` keeps reporting the real appearance.
    void setNativeTheme(theme === 'system' ? null : scheme).catch(() => undefined);
  }, [theme, scheme]);
  return null;
}

/**
 * Platform, native window state and theme for the whole app (wired to `@genslate/tauri-bridge`),
 * plus the app-wide tooltip grouping and toast host.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [platform] = useState(detectPlatform);
  const { isFocused, isMaximized, isFullscreen } = useWindowControls();
  const systemScheme = useSystemTheme();

  return (
    <DesignSystemProvider
      platform={platform}
      systemScheme={systemScheme}
      windowState={{ isFocused, isMaximized, isFullscreen }}
    >
      <NativeThemeSync />
      <TooltipProvider>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </TooltipProvider>
    </DesignSystemProvider>
  );
}
