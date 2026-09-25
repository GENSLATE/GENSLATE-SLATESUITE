import type { ReactNode } from 'react';
import type { Platform } from '../../utils/platform.util';
import type { ThemeProviderProps } from '../theme/theme.types';
import type { WindowState } from '../window-state/window-state.types';

export interface DesignSystemProviderProps
  extends Pick<
    ThemeProviderProps,
    | 'theme'
    | 'defaultTheme'
    | 'onThemeChange'
    | 'onResolvedThemeChange'
    | 'systemScheme'
    | 'storageKey'
  > {
  children?: ReactNode | undefined;
  platform?: Platform | undefined;
  windowState?: Partial<WindowState> | undefined;
  /** Text direction for Base UI parts. @default 'ltr' */
  direction?: 'ltr' | 'rtl' | undefined;
}
