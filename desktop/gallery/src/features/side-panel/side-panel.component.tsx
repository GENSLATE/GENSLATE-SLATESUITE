import { Sidebar, SidebarHeader, Tab, Tabs, TabsList, TabsPanel } from '@genslate/design-system';

import { type SidePanelId, useGallery } from '../../app/gallery.context';
import { SIDE_PANELS } from './side-panels.registry';

/**
 * The left panel: a tab per module (Library, Folders, Places, and the People, Memories and
 * Assistant previews), then its content.
 */
export function SidePanel() {
  const api = useGallery();
  const active = SIDE_PANELS.find((panel) => panel.id === api.sidePanel) ?? SIDE_PANELS[0];

  return (
    <Sidebar aria-label="Side panel" data-context-zone="sidebar">
      <Tabs
        value={api.sidePanel}
        onValueChange={(value: SidePanelId) => api.setSidePanel(value)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList aria-label="Side panel tabs" className="shrink-0 px-1">
          {SIDE_PANELS.map((panel) => (
            <Tab
              key={panel.id}
              value={panel.id}
              icon={panel.icon}
              aria-label={panel.preview ? `${panel.title} (coming soon)` : panel.title}
              title={panel.preview ? `${panel.title} · coming soon` : panel.title}
              className="h-9 flex-1 px-0"
            />
          ))}
        </TabsList>
        {active === undefined ? null : <SidebarHeader title={active.title} className="shrink-0" />}
        {SIDE_PANELS.map((panel) => {
          const Panel = panel.component;
          return (
            <TabsPanel
              key={panel.id}
              value={panel.id}
              className="flex min-h-0 flex-1 flex-col data-hidden:hidden"
            >
              {panel.id === api.sidePanel ? <Panel /> : null}
            </TabsPanel>
          );
        })}
      </Tabs>
    </Sidebar>
  );
}
