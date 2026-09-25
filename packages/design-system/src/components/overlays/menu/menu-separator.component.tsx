import { Menu as BaseMenu } from '@base-ui/react/menu';
import { cn } from '../../../utils/cn.util';
import type { MenuSeparatorProps } from './menu.types';
import { menuVariants } from './menu.variants';

const styles = menuVariants();

export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
  return (
    <BaseMenu.Separator
      data-slot="menu-separator"
      className={cn(styles.separator(), className)}
      {...props}
    />
  );
}
