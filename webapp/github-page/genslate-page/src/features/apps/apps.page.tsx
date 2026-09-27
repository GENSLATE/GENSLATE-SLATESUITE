import { SegmentedControl, SegmentedControlItem } from '@genslate/design-system';
import { useState } from 'react';
import { flushSync } from 'react-dom';

import { runViewTransition } from '../../app/view-transition.util';
import { AppCard } from '../../components/app-card.component';
import { CtaBand } from '../../components/cta-band.component';
import { SectionHeading } from '../../components/section.component';
import { APPS, type AppCategory, CATEGORY_ORDER } from '../../content/apps.content';

type Filter = 'all' | AppCategory;

const NUMBER_WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'] as const;

const CATEGORIES = CATEGORY_ORDER.filter((category) =>
  APPS.some((app) => app.category === category),
);

/** Every app, filterable by category; cards re-flow inside a view transition. */
export function AppsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const visible = filter === 'all' ? APPS : APPS.filter((app) => app.category === filter);
  const available = APPS.filter((app) => app.status === 'preview').length;
  const count = NUMBER_WORDS[available] ?? String(available);

  const change = (next: string) =>
    runViewTransition('layout', () => flushSync(() => setFilter(next as Filter)));

  return (
    <>
      <div className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dots" />
        <div className="mx-auto max-w-site px-4 pt-16 pb-10 sm:px-6 md:pt-24">
          <SectionHeading
            level={1}
            eyebrow="The GENSLATE suite"
            title="Thirteen apps. One family."
            lead={`${count} are in preview today and build from source; the rest are designed and on the way. Open any app to see its window — a live preview built with the GENSLATE design kit.`}
          />
          <div className="reveal mt-10 overflow-x-auto pb-1 [scrollbar-width:none]">
            <SegmentedControl
              aria-label="Filter apps by category"
              value={filter}
              onValueChange={change}
            >
              <SegmentedControlItem value="all">All</SegmentedControlItem>
              {CATEGORIES.map((category) => (
                <SegmentedControlItem key={category} value={category}>
                  {category}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-site px-4 pb-24 sm:px-6">
        <p className="sr-only" aria-live="polite">
          {visible.length} apps shown
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((app, index) => (
            <div key={app.id} style={{ viewTransitionName: `app-card-${app.id}` }} className="grid">
              <AppCard app={app} index={index} morph />
            </div>
          ))}
        </div>
      </div>
      <CtaBand />
    </>
  );
}
