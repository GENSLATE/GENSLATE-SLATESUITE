import type { ReactNode } from 'react';

/** A concrete Nord theme. */
export type ResolvedTheme = 'polar-night' | 'snow-storm';

/** A theme preference: a concrete theme, or follow the OS appearance. */
export type ThemePreference = ResolvedTheme | 'system';

export type ColorScheme = 'dark' | 'light';

export interface ThemeContextValue {
  /** The preference (may be `system`). */
  theme: ThemePreference;
  /** The theme actually applied. */
  resolvedTheme: ResolvedTheme;
  /** `dark` for Polar Night, `light` for Snow Storm. */
  scheme: ColorScheme;
  setTheme: (theme: ThemePreference) => void;
  /** Flips between Polar Night and Snow Storm (leaving `system`). */
  toggleTheme: () => void;
}

export interface ThemeProviderProps {
  children?: ReactNode | undefined;
  /** Controlled preference. */
  theme?: ThemePreference | undefined;
  /** Uncontrolled initial preference when nothing is stored. @default 'system' */
  defaultTheme?: ThemePreference | undefined;
  onThemeChange?: ((theme: ThemePreference) => void) | undefined;
  /** Fires whenever the applied theme changes (e.g. to sync the native window appearance). */
  onResolvedThemeChange?: ((theme: ResolvedTheme, scheme: ColorScheme) => void) | undefined;
  /**
   * The OS appearance, when the host knows it better than `prefers-color-scheme`
   * (e.g. Tauri's window theme). Defaults to the media query.
   */
  systemScheme?: ColorScheme | undefined;
  /** localStorage key for the uncontrolled preference. `null` disables persistence. @default 'genslate.theme' */
  storageKey?: string | null | undefined;
}
