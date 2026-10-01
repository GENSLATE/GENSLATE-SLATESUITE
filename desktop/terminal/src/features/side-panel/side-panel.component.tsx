import { Sidebar, SidebarTabs } from '@genslate/design-system';

import { useTerminal } from '../../app/terminal.context';
import { SIDE_PANELS } from './side-panels.registry';

/** The left panel: a tab per module (Files, Sessions, Snippets, History and the previews). */
export function SidePanel() {
  const api = useTerminal();

  return (
    <Sidebar aria-label="Side panel" data-context-zone="sidebar">
      <SidebarTabs tabs={SIDE_PANELS} value={api.sidePanel} onValueChange={api.setSidePanel} />
    </Sidebar>
  );
}
