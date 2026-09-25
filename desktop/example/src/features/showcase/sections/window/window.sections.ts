import type { ShowcaseSection } from '../../showcase.types';
import { AppShellSection } from './app-shell.section';
import { StatusBarSectionPage } from './status-bar.section';
import { TitleBarSection } from './title-bar.section';
import { TrafficLightsSection } from './traffic-lights.section';

/** Showcase pages for the `window` category, in sidebar order. */
export const windowSections: readonly ShowcaseSection[] = [
  {
    id: 'title-bar',
    title: 'Title Bar',
    description: 'A 38px unified titlebar with a VS Code command center, per-platform window controls and drag regions.',
    category: 'window',
    icon: 'codicon:window',
    component: TitleBarSection,
  },
  {
    id: 'traffic-lights',
    title: 'Window Controls',
    description: 'Pixel-accurate macOS traffic lights and Windows caption buttons for custom titlebars.',
    category: 'window',
    icon: 'codicon:chrome-restore',
    component: TrafficLightsSection,
  },
  {
    id: 'status-bar',
    title: 'Status Bar',
    description: 'VS Code’s status bar: static facts and clickable items, with one accent item.',
    category: 'window',
    icon: 'codicon:layout-statusbar',
    component: StatusBarSectionPage,
  },
  {
    id: 'app-shell',
    title: 'App Shell',
    description: 'The window grid with a resizable, collapsible sidebar and an optional inspector.',
    category: 'window',
    icon: 'codicon:layout',
    component: AppShellSection,
  },
];
