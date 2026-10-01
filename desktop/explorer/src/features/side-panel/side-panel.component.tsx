import { Sidebar, SidebarTabs } from '@genslate/design-system';

import { useExplorer } from '../../app/explorer.context';
import { SIDE_PANELS } from './side-panels.registry';

/** The left panel: a tab per module (Files, Git, Chat, Smart folders), then its content. */
export function SidePanel() {
  const api = useExplorer();

  return (
    <Sidebar aria-label="Side panel" data-context-zone="sidebar">
      <SidebarTabs
        tabs={SIDE_PANELS}
        value={api.sidePanel}
        onValueChange={api.setSidePanel}
        header
      />
    </Sidebar>
  );
}
