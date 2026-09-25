import type { ShowcaseSection } from '../../showcase.types';
import { ColorsSection } from './colors.section';
import { IconsSection } from './icons.section';
import { MotionSection } from './motion.section';
import { SpacingSection } from './spacing.section';
import { TypographySection } from './typography.section';

/** Showcase pages for the `foundations` category, in sidebar order. */
export const foundationsSections: readonly ShowcaseSection[] = [
  {
    id: 'colors',
    title: 'Colors',
    description: 'Official Nord, mapped to semantic and chrome roles. Swatches follow the current theme.',
    category: 'foundations',
    icon: 'codicon:symbol-color',
    component: ColorsSection,
  },
  {
    id: 'typography',
    title: 'Typography',
    description: 'Inter at a 13px base with optical tracking, JetBrains Mono for code.',
    category: 'foundations',
    icon: 'codicon:text-size',
    component: TypographySection,
  },
  {
    id: 'spacing',
    title: 'Spacing & Elevation',
    description: 'The 4px grid, radii, shadows and the fixed sizes of desktop chrome.',
    category: 'foundations',
    icon: 'codicon:symbol-ruler',
    component: SpacingSection,
  },
  {
    id: 'motion',
    title: 'Motion',
    description: 'Short, quiet transitions on transform and opacity, with a spring for toggles.',
    category: 'foundations',
    icon: 'codicon:pulse',
    component: MotionSection,
  },
  {
    id: 'icons',
    title: 'Icons',
    description: 'VS Code Codicons on a 16px grid; Lucide only where no Codicon fits.',
    category: 'foundations',
    icon: 'codicon:symbol-misc',
    component: IconsSection,
  },
];
