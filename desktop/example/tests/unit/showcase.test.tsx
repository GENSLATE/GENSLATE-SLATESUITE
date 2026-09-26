import { describe, expect, test } from 'bun:test';
import { DesignSystemProvider } from '@genslate/design-system';
import { render } from '@testing-library/react';
import { SHOWCASE_GROUPS, SHOWCASE_SECTIONS } from '../../src/features/showcase/showcase.registry';

describe('showcase registry', () => {
  test('lists the nine categories in sidebar order with unique page ids', () => {
    expect(SHOWCASE_GROUPS.map((group) => group.id)).toEqual([
      'foundations',
      'window',
      'layout',
      'actions',
      'inputs',
      'navigation',
      'overlays',
      'feedback',
      'display',
    ]);
    const ids = SHOWCASE_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const group of SHOWCASE_GROUPS) {
      for (const section of group.sections) expect(section.category).toBe(group.id);
    }
  });

  const owned = new Set(['foundations', 'window', 'layout', 'actions', 'feedback', 'display']);
  for (const section of SHOWCASE_SECTIONS.filter((entry) => owned.has(entry.category))) {
    test(`renders the ${section.id} page`, () => {
      const Page = section.component;
      const { container } = render(
        <DesignSystemProvider platform="linux" theme="polar-night">
          <Page />
        </DesignSystemProvider>,
      );
      expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
    });
  }
});
