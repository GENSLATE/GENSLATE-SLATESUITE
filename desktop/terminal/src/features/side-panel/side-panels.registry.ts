/**
 * The side panel's tabs. Each is a self-contained module (id, icon, title, component), so new
 * panels plug in without touching the shell. `preview` panels show what is coming.
 */
import type { SidebarTab } from '@genslate/design-system';

import type { SidePanelId } from '../../app/terminal.context';
import { AssistantPanel } from './assistant-panel.component';
import { FilesPanel } from './files-panel.component';
import { HistoryPanel } from './history-panel.component';
import { SessionsPanel } from './sessions-panel.component';
import { SnippetsPanel } from './snippets-panel.component';
import { WorkflowsPanel } from './workflows-panel.component';

export const SIDE_PANELS: readonly SidebarTab<SidePanelId>[] = [
  { id: 'files', title: 'Files', icon: 'codicon:files', preview: false, component: FilesPanel },
  {
    id: 'sessions',
    title: 'Sessions',
    icon: 'codicon:terminal',
    preview: false,
    component: SessionsPanel,
  },
  {
    id: 'snippets',
    title: 'Snippets',
    icon: 'codicon:symbol-snippet',
    preview: false,
    component: SnippetsPanel,
  },
  {
    id: 'history',
    title: 'History',
    icon: 'codicon:history',
    preview: false,
    component: HistoryPanel,
  },
  {
    id: 'assistant',
    title: 'Assistant',
    icon: 'codicon:chat-sparkle',
    preview: true,
    component: AssistantPanel,
  },
  {
    id: 'workflows',
    title: 'Workflows',
    icon: 'codicon:run-all',
    preview: true,
    component: WorkflowsPanel,
  },
];
