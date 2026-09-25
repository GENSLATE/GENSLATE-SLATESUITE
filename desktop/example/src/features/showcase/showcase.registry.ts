import type { CodiconRef } from '@genslate/design-system';
import { actionsSections } from './sections/actions/actions.sections';
import { displaySections } from './sections/display/display.sections';
import { feedbackSections } from './sections/feedback/feedback.sections';
import { foundationsSections } from './sections/foundations/foundations.sections';
import { inputsSections } from './sections/inputs/inputs.sections';
import { layoutSections } from './sections/layout/layout.sections';
import { navigationSections } from './sections/navigation/navigation.sections';
import { overlaysSections } from './sections/overlays/overlays.sections';
import { windowSections } from './sections/window/window.sections';
import type { ShowcaseCategory, ShowcaseSection } from './showcase.types';

export interface ShowcaseGroup {
  readonly id: ShowcaseCategory;
  readonly title: string;
  readonly icon: CodiconRef;
  readonly sections: readonly ShowcaseSection[];
}

/** Sidebar groups, in order. */
export const SHOWCASE_GROUPS: readonly ShowcaseGroup[] = [
  { id: 'foundations', title: 'Foundations', icon: 'codicon:symbol-color', sections: foundationsSections },
  { id: 'window', title: 'Window', icon: 'codicon:window', sections: windowSections },
  { id: 'layout', title: 'Layout', icon: 'codicon:layout', sections: layoutSections },
  { id: 'actions', title: 'Actions', icon: 'codicon:symbol-event', sections: actionsSections },
  { id: 'inputs', title: 'Inputs', icon: 'codicon:edit', sections: inputsSections },
  { id: 'navigation', title: 'Navigation', icon: 'codicon:compass', sections: navigationSections },
  { id: 'overlays', title: 'Overlays', icon: 'codicon:layers', sections: overlaysSections },
  { id: 'feedback', title: 'Feedback', icon: 'codicon:pulse', sections: feedbackSections },
  { id: 'display', title: 'Display', icon: 'codicon:eye', sections: displaySections },
];

/** Every showcase page, flattened in sidebar order. */
export const SHOWCASE_SECTIONS: readonly ShowcaseSection[] = SHOWCASE_GROUPS.flatMap((group) => group.sections);

export const DEFAULT_SECTION_ID = SHOWCASE_SECTIONS[0]?.id ?? 'colors';

export function findSection(id: string): ShowcaseSection | undefined {
  return SHOWCASE_SECTIONS.find((section) => section.id === id);
}

export function groupOf(section: ShowcaseSection): ShowcaseGroup | undefined {
  return SHOWCASE_GROUPS.find((group) => group.id === section.category);
}
