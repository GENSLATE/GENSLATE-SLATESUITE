/**
 * The side panel's tabs. Each is a self-contained module (id, icon, title, component), so new
 * panels (a Git view, the assistant, smart folders) plug in without touching the shell.
 */
import type { SidebarTab } from '@genslate/design-system';

import type { SidePanelId } from '../../app/explorer.context';
import { ChatPanel } from './chat-panel.component';
import { FilesPanel } from './files-panel.component';
import { GitPanel } from './git-panel.component';
import { SmartPanel } from './smart-panel.component';

export const SIDE_PANELS: readonly SidebarTab<SidePanelId>[] = [
  { id: 'files', title: 'Files', icon: 'codicon:files', preview: false, component: FilesPanel },
  { id: 'git', title: 'Git', icon: 'codicon:source-control', preview: true, component: GitPanel },
  { id: 'chat', title: 'Chat', icon: 'codicon:chat-sparkle', preview: true, component: ChatPanel },
  {
    id: 'smart',
    title: 'Smart folders',
    icon: 'codicon:sparkle',
    preview: true,
    component: SmartPanel,
  },
];
