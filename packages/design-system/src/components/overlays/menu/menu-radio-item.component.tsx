import { Menu as BaseMenu } from '@base-ui/react/menu';
import { listItem } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { MenuRadioGroupProps, MenuRadioItemProps } from './menu.types';
import { menuVariants } from './menu.variants';
import { MenuShortcut } from './menu-shortcut.component';

const styles = menuVariants();

/** A set of mutually exclusive `MenuRadioItem`s. */
export function MenuRadioGroup({ className, ...props }: MenuRadioGroupProps) {
  return <BaseMenu.RadioGroup data-slot="menu-radio-group" className={className} {...props} />;
}

/** One choice of a `MenuRadioGroup`, marked with a leading dot. */
export function MenuRadioItem({
  icon,
  shortcut,
  platform,
  className,
  children,
  ...props
}: MenuRadioItemProps) {
  return (
    <BaseMenu.RadioItem
      data-slot="menu-radio-item"
      className={cn(listItem({ inset: true }), className)}
      {...props}
    >
      <BaseMenu.RadioItemIndicator
        data-slot="menu-radio-item-indicator"
        className={styles.indicator()}
      >
        <span className={styles.radioDot()} />
      </BaseMenu.RadioItemIndicator>
      {icon != null && <Icon name={icon} size={16} className={styles.icon()} />}
      <span className={styles.label()}>{children}</span>
      {shortcut != null && <MenuShortcut shortcut={shortcut} platform={platform} />}
    </BaseMenu.RadioItem>
  );
}
