import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon/icon.component';
import { Kbd } from '../../display/kbd/kbd.component';
import type { TitleBarCommandCenterProps } from './title-bar.types';
import { commandCenterVariants } from './title-bar.variants';

/** VS Code's command center: a search-looking pill in the titlebar that opens the command palette. */
export function TitleBarCommandCenter({
  children = 'Search',
  shortcut = 'mod+k',
  className,
  ...props
}: TitleBarCommandCenterProps) {
  const styles = commandCenterVariants();
  return (
    <button
      type="button"
      data-slot="titlebar-command-center"
      aria-haspopup="dialog"
      className={cn(styles.root(), className)}
      {...props}
    >
      <Icon name="codicon:search" size={14} className={styles.icon()} />
      <span className={styles.label()}>{children}</span>
      {shortcut != null && (
        <Kbd shortcut={shortcut} variant="inline" size="sm" className={styles.hint()} />
      )}
    </button>
  );
}
