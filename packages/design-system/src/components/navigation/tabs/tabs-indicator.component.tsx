import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { cn } from '../../../utils/cn.util';
import type { TabsIndicatorProps } from './tabs.types';
import { tabsVariants } from './tabs.variants';
import { useTabsVariant } from './tabs-context';

/** The sliding selection marker, positioned from Base UI's `--active-tab-*` variables. */
export function TabsIndicator({ className, ...props }: TabsIndicatorProps) {
  const variant = useTabsVariant();
  return (
    <BaseTabs.Indicator
      data-slot="tabs-indicator"
      className={cn(tabsVariants({ variant }).indicator(), className)}
      {...props}
    />
  );
}
