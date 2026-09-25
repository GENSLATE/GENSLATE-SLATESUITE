import { DirectionProvider } from '@base-ui/react/direction-provider';
import { PlatformProvider } from '../platform/platform.provider';
import { ThemeProvider } from '../theme/theme.provider';
import { WindowStateProvider } from '../window-state/window-state.provider';
import type { DesignSystemProviderProps } from './design-system.types';

/** One provider for an app: platform, window state, theme and text direction. */
export function DesignSystemProvider({
  children,
  platform,
  windowState,
  direction = 'ltr',
  ...themeProps
}: DesignSystemProviderProps) {
  return (
    <PlatformProvider platform={platform}>
      <WindowStateProvider {...windowState}>
        <ThemeProvider {...themeProps}>
          <DirectionProvider direction={direction}>{children}</DirectionProvider>
        </ThemeProvider>
      </WindowStateProvider>
    </PlatformProvider>
  );
}
