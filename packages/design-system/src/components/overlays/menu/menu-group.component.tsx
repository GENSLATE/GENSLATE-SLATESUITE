import { Menu as BaseMenu } from '@base-ui/react/menu';
import { cn } from '../../../utils/cn.util';
import type { MenuGroupLabelProps, MenuGroupProps } from './menu.types';
import { menuVariants } from './menu.variants';

const styles = menuVariants();

export function MenuGroup({ className, ...props }: MenuGroupProps) {
  return <BaseMenu.Group data-slot="menu-group" className={className} {...props} />;
}

/** A small, muted section heading inside a `MenuGroup` or `MenuRadioGroup`. */
export function MenuGroupLabel({ inset = false, className, ...props }: MenuGroupLabelProps) {
  return (
    <BaseMenu.GroupLabel
      data-slot="menu-group-label"
      className={cn(styles.groupLabel(), inset && 'pl-7', className)}
      {...props}
    />
  );
}
