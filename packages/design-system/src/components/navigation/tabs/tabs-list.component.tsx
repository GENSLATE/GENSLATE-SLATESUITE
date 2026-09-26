import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { cn } from '../../../utils/cn.util';
import type { TabsListProps } from './tabs.types';
import { tabsVariants } from './tabs.variants';
import { useTabsVariant } from './tabs-context';
import { TabsIndicator } from './tabs-indicator.component';

export function TabsList({ indicator = true, className, children, ...props }: TabsListProps) {
  const variant = useTabsVariant();
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      className={cn(tabsVariants({ variant }).list(), className)}
      {...props}
    >
      {children}
      {indicator && <TabsIndicator />}
    </BaseTabs.List>
  );
}
