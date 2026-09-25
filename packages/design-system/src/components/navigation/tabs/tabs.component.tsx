import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { cn } from '../../../utils/cn.util';
import type { TabsProps } from './tabs.types';
import { tabsVariants } from './tabs.variants';
import { TabsVariantContext } from './tabs-context';

/**
 * Tabs with two looks: `underline` (VS Code panel tabs, sliding accent bar) and `pill`
 * (macOS segmented control). Arrow keys move focus; Enter/Space activate (APG manual activation).
 */
export function Tabs({ variant = 'underline', className, ...props }: TabsProps) {
  return (
    <TabsVariantContext value={variant}>
      <BaseTabs.Root
        data-slot="tabs"
        data-variant={variant}
        className={cn(tabsVariants({ variant }).root(), className)}
        {...props}
      />
    </TabsVariantContext>
  );
}
