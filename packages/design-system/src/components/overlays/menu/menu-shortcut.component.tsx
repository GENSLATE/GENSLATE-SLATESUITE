import { listItemHint } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { guessPlatform } from '../../../utils/platform.util';
import { formatShortcut } from '../../../utils/shortcut.util';
import type { MenuShortcutProps } from './menu.types';

/** Trailing shortcut hint of a menu row (`⌘⇧P` on macOS, `Ctrl+Shift+P` elsewhere). */
export function MenuShortcut({ shortcut, platform, className }: MenuShortcutProps) {
  return (
    <kbd data-slot="menu-shortcut" className={cn(listItemHint(), 'font-sans', className)}>
      {formatShortcut(shortcut, platform ?? guessPlatform())}
    </kbd>
  );
}
