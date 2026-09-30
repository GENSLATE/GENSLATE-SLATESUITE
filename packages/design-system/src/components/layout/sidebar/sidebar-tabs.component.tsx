import { cn } from '../../../utils/cn.util';
import { Tabs } from '../../navigation/tabs/tabs.component';
import { TabsList } from '../../navigation/tabs/tabs-list.component';
import { TabsPanel } from '../../navigation/tabs/tabs-panel.component';
import { Tab } from '../../navigation/tabs/tabs-tab.component';
import { SidebarHeader } from './sidebar.component';
import type { SidebarTabsProps } from './sidebar.types';
import { sidebarVariants } from './sidebar.variants';

const styles = sidebarVariants();

/**
 * A sidebar made of modules: a row of icon tabs (Files, Git, Assistant…), then the active
 * module's view. Put it inside `Sidebar`. Previews of coming features are named as such, and
 * only the active view is mounted, so a hidden module does no work.
 */
export function SidebarTabs<Id extends string>({
  tabs,
  value,
  onValueChange,
  header = false,
  labels,
  className,
}: SidebarTabsProps<Id>) {
  const active = tabs.find((tab) => tab.id === value) ?? tabs[0];
  const soon = labels?.preview ?? 'coming soon';

  return (
    <Tabs
      data-slot="sidebar-tabs"
      value={value}
      onValueChange={(next: Id) => onValueChange(next)}
      className={cn(styles.tabs(), className)}
    >
      <TabsList aria-label={labels?.tabs ?? 'Side panel tabs'} className={styles.tabsList()}>
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            icon={tab.icon}
            aria-label={tab.preview === true ? `${tab.title} (${soon})` : tab.title}
            title={tab.preview === true ? `${tab.title} · ${soon}` : tab.title}
            className={styles.tab()}
          />
        ))}
      </TabsList>
      {header && active !== undefined ? (
        <SidebarHeader title={active.title} className="shrink-0" />
      ) : null}
      {tabs.map((tab) => {
        const View = tab.component;
        return (
          <TabsPanel
            key={tab.id}
            value={tab.id}
            data-slot="sidebar-tabs-panel"
            className={styles.tabsPanel()}
          >
            {tab.id === active?.id ? <View /> : null}
          </TabsPanel>
        );
      })}
    </Tabs>
  );
}
