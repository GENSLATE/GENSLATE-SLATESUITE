import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { TabProps } from './tabs.types';
import { tabsVariants } from './tabs.variants';
import { useTabsVariant } from './tabs-context';

export function Tab({ icon, className, children, ...props }: TabProps) {
  const variant = useTabsVariant();
  return (
    <BaseTabs.Tab
      data-slot="tabs-tab"
      className={cn(tabsVariants({ variant }).tab(), className)}
      {...props}
    >
      {icon != null && <Icon name={icon} size={14} />}
      {children}
    </BaseTabs.Tab>
  );
}
