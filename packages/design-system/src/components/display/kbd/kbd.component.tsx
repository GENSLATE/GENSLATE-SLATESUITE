import { usePlatform } from '../../../hooks/use-platform.hook';
import { cn } from '../../../utils/cn.util';
import { usesMacKeys } from '../../../utils/platform.util';
import { formatShortcut, shortcutKeys } from '../../../utils/shortcut.util';
import type { KbdProps } from './kbd.types';
import { kbdVariants } from './kbd.variants';

/** A keyboard shortcut as keycaps (or inline text), with platform-correct symbols. */
export function Kbd({
  shortcut,
  platform: platformProp,
  variant = 'keycap',
  size = 'md',
  className,
  ...props
}: KbdProps) {
  const contextPlatform = usePlatform();
  const platform = platformProp ?? contextPlatform;
  const styles = kbdVariants({ variant, size });
  const label = formatShortcut(shortcut, platform);

  if (variant === 'inline') {
    return (
      <kbd data-slot="kbd" className={cn(styles.root(), className)} {...props}>
        {label}
      </kbd>
    );
  }

  const keys = shortcutKeys(shortcut, platform);
  const mac = usesMacKeys(platform);
  return (
    <kbd data-slot="kbd" aria-label={label} className={cn(styles.root(), className)} {...props}>
      {keys.map((key, index) => (
        // Keys can repeat ("shift+shift"): index keeps them unique.
        // biome-ignore lint/suspicious/noArrayIndexKey: static, order-stable list
        <span key={`${key}-${index}`} className="contents">
          {!mac && index > 0 && (
            <span aria-hidden className={styles.separator()}>
              +
            </span>
          )}
          <kbd data-slot="kbd-key" aria-hidden className={styles.key()}>
            {key}
          </kbd>
        </span>
      ))}
    </kbd>
  );
}
