import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useControllableState } from '../../hooks/use-controllable-state.hook';
import { useMediaQuery } from '../../hooks/use-media-query.hook';
import { ThemeContext } from './theme.context';
import { readStoredTheme, resolveTheme, THEME_STORAGE_KEY } from './theme.script';
import type {
  ColorScheme,
  ThemeContextValue,
  ThemePreference,
  ThemeProviderProps,
} from './theme.types';

/**
 * Applies a Nord theme to `<html data-theme>` and shares it through `useTheme()`.
 * Controlled (`theme` + `onThemeChange`) or uncontrolled (persisted to localStorage).
 * During a switch `<html data-theme-switching>` is set for one frame so nothing animates.
 */
export function ThemeProvider({
  children,
  theme: themeProp,
  defaultTheme = 'system',
  onThemeChange,
  onResolvedThemeChange,
  systemScheme,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState, isControlled] = useControllableState<ThemePreference>({
    value: themeProp,
    defaultValue: () => (storageKey ? readStoredTheme(storageKey) : null) ?? defaultTheme,
    onChange: onThemeChange,
  });

  const mediaPrefersDark = useMediaQuery('(prefers-color-scheme: dark)', true);
  const prefersDark = systemScheme ? systemScheme === 'dark' : mediaPrefersDark;
  const resolvedTheme = resolveTheme(theme, prefersDark);
  const scheme: ColorScheme = resolvedTheme === 'polar-night' ? 'dark' : 'light';

  // Apply before paint; suppress transitions for exactly one frame.
  const firstApply = useRef(true);
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (root.dataset['theme'] === resolvedTheme) {
      firstApply.current = false;
      return;
    }
    const animate = !firstApply.current;
    firstApply.current = false;
    if (animate) root.setAttribute('data-theme-switching', '');
    root.dataset['theme'] = resolvedTheme;
    if (!animate) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => root.removeAttribute('data-theme-switching'));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      root.removeAttribute('data-theme-switching');
    };
  }, [resolvedTheme]);

  // Persist uncontrolled preferences.
  useEffect(() => {
    if (isControlled || !storageKey) return;
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Storage can be unavailable (private mode, sandboxed webviews): the theme still applies.
    }
  }, [isControlled, storageKey, theme]);

  // Notify the host (native window theme sync) whenever the applied theme changes.
  const notifyResolved = useRef(onResolvedThemeChange);
  useLayoutEffect(() => {
    notifyResolved.current = onResolvedThemeChange;
  });
  useEffect(() => {
    notifyResolved.current?.(resolvedTheme, scheme);
  }, [resolvedTheme, scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      scheme,
      setTheme: setThemeState,
      toggleTheme: () =>
        setThemeState(resolvedTheme === 'polar-night' ? 'snow-storm' : 'polar-night'),
    }),
    [theme, resolvedTheme, scheme, setThemeState],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
