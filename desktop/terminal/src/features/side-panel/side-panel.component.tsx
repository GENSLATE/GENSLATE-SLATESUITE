import { Sidebar, Tab, Tabs, TabsList, TabsPanel } from '@genslate/design-system';

import { type SidePanelId, useTerminal } from '../../app/terminal.context';
import { SIDE_PANELS } from './side-panels.registry';

/** The left panel: a tab per module (Files, Sessions, Snippets, History and the previews). */
export function SidePanel() {
  const api = useTerminal();

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
