import { describe, expect, test } from 'bun:test';

import { isInside } from '../../../src/model/path.util';

describe('paths', () => {
  test('a folder holds itself and what is below it, not its look-alike siblings', () => {
    expect(isInside('/photos/2026/a.jpg', '/photos')).toBe(true);
    expect(isInside('/photos', '/photos/')).toBe(true);
    expect(isInside('/photos-old/a.jpg', '/photos')).toBe(false);
  });

  test('Windows paths use backslashes, drive roots included', () => {
    expect(isInside('D:\\Pictures\\a.jpg', 'D:\\Pictures')).toBe(true);
    expect(isInside('D:\\Pictures\\a.jpg', 'D:\\')).toBe(true);
    expect(isInside('D:\\Pictures2\\a.jpg', 'D:\\Pictures')).toBe(false);
  });
});
