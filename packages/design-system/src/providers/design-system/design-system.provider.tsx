import { DirectionProvider } from '@base-ui/react/direction-provider';
import { CursorProvider } from '../cursor/cursor.provider';
import { PlatformProvider } from '../platform/platform.provider';
import { ThemeProvider } from '../theme/theme.provider';
import { WindowStateProvider } from '../window-state/window-state.provider';
import type { DesignSystemProviderProps } from './design-system.types';

/** One provider for an app: platform, window state, theme, cursor style and text direction. */
export function DesignSystemProvider({
  children,
  platform,
  windowState,
  direction = 'ltr',
  cursorStyle,
  defaultCursorStyle,
  onCursorStyleChange,
  cursorStorageKey,
  ...themeProps
}: DesignSystemProviderProps) {
  return (
    <PlatformProvider platform={platform}>
      <WindowStateProvider {...windowState}>
        <ThemeProvider {...themeProps}>
          <CursorProvider
            cursorStyle={cursorStyle}
            defaultCursorStyle={defaultCursorStyle}
            onCursorStyleChange={onCursorStyleChange}
            cursorStorageKey={cursorStorageKey}
          >
            <DirectionProvider direction={direction}>{children}</DirectionProvider>
          </CursorProvider>
        </ThemeProvider>
      </WindowStateProvider>
    </PlatformProvider>
  );
}
