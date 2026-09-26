import type { ShowcaseSection } from '../../showcase.types';
import { BadgeSection } from './badge.section';
import { BannerSection } from './banner.section';
import { EmptyStateSection } from './empty-state.section';
import { ProgressSection } from './progress.section';
import { SkeletonSection } from './skeleton.section';

/** Showcase pages for the `feedback` category, in sidebar order. */
export const feedbackSections: readonly ShowcaseSection[] = [
  {
    id: 'badge',
    title: 'Badge',
    description: 'Compact labels and counts. Aurora tones only ever mean status.',
    category: 'feedback',
    icon: 'codicon:tag',
    component: BadgeSection,
  },
  {
    id: 'banner',
    title: 'Banner',
    description: 'Inline status messages with a tone icon, actions and dismiss.',
    category: 'feedback',
    icon: 'codicon:info',
    component: BannerSection,
  },
  {
    id: 'progress',
    title: 'Progress & Spinner',
    description: 'Thin progress bars and VS Code-style spinners.',
    category: 'feedback',
    icon: 'codicon:loading',
    component: ProgressSection,
  },
  {
    id: 'skeleton',
    title: 'Skeleton',
    description: 'Placeholders for content that is on its way.',
    category: 'feedback',
    icon: 'codicon:symbol-namespace',
    component: SkeletonSection,
  },
  {
    id: 'empty-state',
    title: 'Empty State',
    description: 'What to show when there is nothing to show — and a way forward.',
    category: 'feedback',
    icon: 'codicon:inbox',
    component: EmptyStateSection,
  },
];
