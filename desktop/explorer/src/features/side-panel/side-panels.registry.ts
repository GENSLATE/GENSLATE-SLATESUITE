/**
 * The side panel's tabs. Each is a self-contained module (id, icon, title, component), so new
 * panels (a Git view, the assistant, smart folders) plug in without touching the shell.
 */
import type { CodiconRef } from '@genslate/design-system';
import type { ComponentType } from 'react';

import type { SidePanelId } from '../../app/explorer.context';
import { ChatPanel } from './chat-panel.component';
import { FilesPanel } from './files-panel.component';
import { GitPanel } from './git-panel.component';
import { SmartPanel } from './smart-panel.component';

export interface SidePanelModule {
  readonly id: SidePanelId;
  readonly title: string;
  readonly icon: CodiconRef;
  /** A preview of a coming feature (shown with a "Coming soon" hint). */
  readonly preview: boolean;
  readonly component: ComponentType;
}

export const SIDE_PANELS: readonly SidePanelModule[] = [
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
