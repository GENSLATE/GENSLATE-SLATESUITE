import type { ComponentPropsWithRef } from 'react';
import type { Platform } from '../../../utils/platform.util';

export interface KbdProps extends Omit<ComponentPropsWithRef<'kbd'>, 'children'> {
  /** A shortcut like `"mod+shift+p"`, rendered per platform (⌘⇧P on macOS, Ctrl+Shift+P elsewhere). */
  shortcut: string;
  /** Overrides the platform from `PlatformProvider`. */
  platform?: Platform | undefined;
  /** `keycap`: one cap per key · `inline`: plain text, for menus and hints. @default 'keycap' */
  variant?: 'keycap' | 'inline' | undefined;
  /** @default 'md' */
  size?: 'sm' | 'md' | undefined;
}
