import type { Platform } from '../../../utils/platform.util';
import type { TextFieldLabels, TextFieldProps } from '../text-field/text-field.types';

export interface SearchFieldLabels extends TextFieldLabels {
  /** Accessible name of the search input when no `label` / `aria-label` is given. */
  search?: string | undefined;
}

export interface SearchFieldProps
  extends Omit<TextFieldProps, 'leading' | 'clearable' | 'type' | 'labels'> {
  /** Shortcut hint shown while empty, e.g. `"mod+f"` → `⌘F` / `Ctrl+F`. */
  shortcut?: string | undefined;
  /** Platform used to format `shortcut`. Defaults to a user-agent guess. */
  platform?: Platform | undefined;
  /** Pressing Escape clears a non-empty field (default true). */
  clearOnEscape?: boolean | undefined;
  labels?: SearchFieldLabels | undefined;
}
