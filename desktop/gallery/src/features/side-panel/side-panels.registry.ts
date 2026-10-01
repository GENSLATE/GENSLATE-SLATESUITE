/**
 * The side panel's tabs. Each is a self-contained module (id, icon, title, component), so new
 * panels plug in without touching the shell. `preview` marks the AI features still to come.
 */
import type { SidebarTab } from '@genslate/design-system';

import type { SidePanelId } from '../../app/gallery.context';
import { AssistantPanel } from './assistant-panel.component';
import { FoldersPanel } from './folders-panel.component';
import { LibraryPanel } from './library-panel.component';
import { MemoriesPanel } from './memories-panel.component';
import { PeoplePanel } from './people-panel.component';
import { PlacesPanel } from './places-panel.component';

export const SIDE_PANELS: readonly SidebarTab<SidePanelId>[] = [
  {
    id: 'library',
    title: 'Library',
    icon: 'codicon:library',
    preview: false,
    component: LibraryPanel,
  },
  {
    id: 'folders',
    title: 'Folders',
    icon: 'codicon:folder',
    preview: false,
    component: FoldersPanel,
  },
  { id: 'places', title: 'Places', icon: 'codicon:globe', preview: false, component: PlacesPanel },
  { id: 'people', title: 'People', icon: 'codicon:person', preview: true, component: PeoplePanel },
  {
    id: 'memories',
    title: 'Memories',
    icon: 'codicon:history',
    preview: true,
    component: MemoriesPanel,
  },
  {
    id: 'assistant',
    title: 'Assistant',
    icon: 'codicon:sparkle',
    preview: true,
    component: AssistantPanel,
  },
];
