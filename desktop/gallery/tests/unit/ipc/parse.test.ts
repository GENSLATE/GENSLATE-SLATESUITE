import { describe, expect, test } from 'bun:test';

import { PayloadError, parseItems, parseSettings } from '../../../src/ipc/gallery.parse';
import { mediaItem } from '../fixtures';

describe('payload parsing', () => {
  test('accepts well-formed items and rejects anything else', () => {
    expect(parseItems([mediaItem(1), mediaItem(2)])).toHaveLength(2);
    expect(() => parseItems([{ id: 'one' }])).toThrow(PayloadError);
    expect(() => parseItems({})).toThrow(PayloadError);
  });

  test('settings read their TOML keys and fall back to the defaults', () => {
    const settings = parseSettings({ view: 'grid', 'slideshow-seconds': 9, 'group-by': 'decade' });
    expect(settings.view).toBe('grid');
    expect(settings.slideshowSeconds).toBe(9);
    expect(settings.groupBy).toBe('month');
    expect(settings.confirmTrash).toBe(true);
  });
});
