export { ThemeContext } from './theme.context';
export { ThemeProvider } from './theme.provider';
export {
  applyInitialTheme,
  isThemePreference,
  readStoredTheme,
  resolveTheme,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  themeInitScript,
} from './theme.script';
export type {
  ColorScheme,
  ResolvedTheme,
  ThemeContextValue,
  ThemePreference,
  ThemeProviderProps,
} from './theme.types';
