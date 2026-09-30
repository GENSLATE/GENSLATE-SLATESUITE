import { Sidebar, SidebarTabs } from '@genslate/design-system';

import { useGallery } from '../../app/gallery.context';
import { SIDE_PANELS } from './side-panels.registry';

/**
 * The left panel: a tab per module (Library, Folders, Places, and the People, Memories and
 * Assistant previews), then its content.
 */
export function SidePanel() {
  const api = useGallery();

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
