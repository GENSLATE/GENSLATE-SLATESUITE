import { createContext } from 'react';
import type { ThemeContextValue } from './theme.types';

export const ThemeContext = createContext<ThemeContextValue | null>(null);
ThemeContext.displayName = 'ThemeContext';
