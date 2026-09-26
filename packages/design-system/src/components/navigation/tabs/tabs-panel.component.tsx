import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { cn } from '../../../utils/cn.util';
import type { TabsPanelProps } from './tabs.types';
import { tabsVariants } from './tabs.variants';
import { useTabsVariant } from './tabs-context';

export function TabsPanel({ className, ...props }: TabsPanelProps) {
  const variant = useTabsVariant();
  return (
    <BaseTabs.Panel
      data-slot="tabs-panel"
      className={cn(tabsVariants({ variant }).panel(), className)}
      {...props}
    />
  );
}
