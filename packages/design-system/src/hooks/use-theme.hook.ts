import { use } from 'react';
import { ThemeContext } from '../providers/theme/theme.context';
import type { ThemeContextValue } from '../providers/theme/theme.types';

/** The current theme and its setters. Must be used inside `ThemeProvider` / `DesignSystemProvider`. */
export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value)
    throw new Error('useTheme() must be used inside <ThemeProvider> or <DesignSystemProvider>.');
  return value;
}
