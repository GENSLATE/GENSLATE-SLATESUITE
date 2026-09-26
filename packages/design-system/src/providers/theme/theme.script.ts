/**
 * Pre-React theme bootstrap. Import from `@genslate/design-system/theme-init`.
 *  - `applyInitialTheme()` — call before `createRoot()` so the first paint is already themed.
 *  - `themeInitScript` — the same logic as an inline `<script>` string for `index.html`.
 * Kept free of React and of any other import so it can run as early as possible.
 */

export const THEME_STORAGE_KEY = 'genslate.theme';
export const THEME_PREFERENCES = ['polar-night', 'snow-storm', 'system'] as const;

type Preference = (typeof THEME_PREFERENCES)[number];
type Resolved = Exclude<Preference, 'system'>;

export function isThemePreference(value: unknown): value is Preference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/** Reads the stored preference, tolerating blocked storage. */
export function readStoredTheme(storageKey: string = THEME_STORAGE_KEY): Preference | null {
  try {
    const value = globalThis.localStorage?.getItem(storageKey);
    return isThemePreference(value) ? value : null;
  } catch {
    return null;
  }
}

/** The OS appearance from `prefers-color-scheme` (dark when unknown). */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return !window.matchMedia('(prefers-color-scheme: light)').matches;
}

export function resolveTheme(
  preference: Preference,
  prefersDark: boolean = systemPrefersDark(),
): Resolved {
  if (preference === 'system') return prefersDark ? 'polar-night' : 'snow-storm';
  return preference;
}

/**
 * Writes `data-theme` on `<html>` from the stored preference (or `fallback`).
 * Returns the applied theme.
 */
export function applyInitialTheme(
  fallback: Preference = 'system',
  storageKey: string = THEME_STORAGE_KEY,
): Resolved {
  const resolved = resolveTheme(readStoredTheme(storageKey) ?? fallback);
  if (typeof document !== 'undefined') document.documentElement.dataset['theme'] = resolved;
  return resolved;
}

/**
 * JSON-encodes a value for embedding inside an inline `<script>` body. Plain `JSON.stringify`
 * does not escape `<`, so a value containing `</script` (or `<!--`) would close the tag early
 * and let anything after it run as unescaped HTML. Escaping `<` as `<` (a no-op outside a
 * string literal) closes that off regardless of what the value ever turns out to contain.
 */
export function jsonForScriptTag(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003C');
}

/** Inline `<script>` body with the same behaviour as `applyInitialTheme()`. */
export const themeInitScript = `(function(){try{var k=${jsonForScriptTag(THEME_STORAGE_KEY)},p=localStorage.getItem(k);if(p!=="polar-night"&&p!=="snow-storm")p=matchMedia("(prefers-color-scheme: light)").matches?"snow-storm":"polar-night";document.documentElement.dataset.theme=p}catch(e){document.documentElement.dataset.theme="polar-night"}})();`;
