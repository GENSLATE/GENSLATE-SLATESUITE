import type { ShowcaseSection } from '../../showcase.types';
import { CardSectionPage } from './card.section';
import { PanelSectionPage } from './panel.section';
import { ScrollAreaSectionPage } from './scroll-area.section';
import { SidebarSectionPage } from './sidebar.section';

/** Showcase pages for the `layout` category, in sidebar order. */
export const layoutSections: readonly ShowcaseSection[] = [
  {
    id: 'sidebar',
    title: 'Sidebar',
    description: 'The macOS source list at VS Code density, with pill selection that dims in background windows.',
    category: 'layout',
    icon: 'codicon:layout-sidebar-left',
    component: SidebarSectionPage,
  },
  {
    id: 'panel',
    title: 'Panel',
    description: 'Titled view regions — VS Code views and macOS inspector panes.',
    category: 'layout',
    icon: 'codicon:layout-panel',
    component: PanelSectionPage,
  },
  {
    id: 'card',
    title: 'Card',
    description: 'Grouped content on a flat, hairlined surface.',
    category: 'layout',
    icon: 'codicon:preview',
    component: CardSectionPage,
  },
  {
    id: 'scroll-area',
    title: 'Scroll Area & Separator',
    description: 'Overlay scrollbars and hairline separators.',
    category: 'layout',
    icon: 'codicon:list-flat',
    component: ScrollAreaSectionPage,
  },
];
