import type { ShowcaseSection } from '../../showcase.types';
import { ButtonSection } from './button.section';
import { IconButtonSection } from './icon-button.section';
import { SegmentedControlSection } from './segmented-control.section';
import { ToggleButtonSection } from './toggle-button.section';
import { ToolbarSection } from './toolbar.section';

/** Showcase pages for the `actions` category, in sidebar order. */
export const actionsSections: readonly ShowcaseSection[] = [
  {
    id: 'button',
    title: 'Button',
    description: 'macOS push buttons at VS Code density, in five variants and four sizes.',
    category: 'actions',
    icon: 'codicon:record-small',
    component: ButtonSection,
  },
  {
    id: 'icon-button',
    title: 'Icon Button',
    description: 'Quiet, square action-bar buttons; labelled, and optionally toggled.',
    category: 'actions',
    icon: 'codicon:gear',
    component: IconButtonSection,
  },
  {
    id: 'toggle-button',
    title: 'Toggle Button',
    description: 'Two-state buttons, alone or in a roving-focus group.',
    category: 'actions',
    icon: 'codicon:bold',
    component: ToggleButtonSection,
  },
  {
    id: 'segmented-control',
    title: 'Segmented Control',
    description: 'A single choice between a few equal options, with a sliding thumb.',
    category: 'actions',
    icon: 'codicon:split-horizontal',
    component: SegmentedControlSection,
  },
  {
    id: 'toolbar',
    title: 'Toolbar',
    description: 'Rows of controls with one tab stop and arrow-key navigation.',
    category: 'actions',
    icon: 'codicon:tools',
    component: ToolbarSection,
  },
];
