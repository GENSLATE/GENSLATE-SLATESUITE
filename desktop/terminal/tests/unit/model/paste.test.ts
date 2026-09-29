import { describe, expect, test } from 'bun:test';

import { reviewPaste } from '../../../src/model/paste.util';

describe('paste review', () => {
  test('a single safe line has no risks (a trailing newline does not count)', () => {
    expect(reviewPaste('git status\n')).toEqual({ lines: 1, risks: [] });
    expect(reviewPaste('')).toEqual({ lines: 0, risks: [] });
  });

  test('several lines, elevation and destructive commands are flagged', () => {
    expect(reviewPaste('cd app\r\nbun install').risks).toEqual(['multiline']);
    expect(reviewPaste('sudo apt upgrade').risks).toEqual(['elevated']);
    expect(reviewPaste('rm -rf ./build').risks).toEqual(['destructive']);
    expect(reviewPaste('Remove-Item .\\dist -Recurse -Force').risks).toEqual(['destructive']);
    expect(reviewPaste('echo hi && sudo rm -fr /tmp/x').risks).toEqual(['elevated', 'destructive']);
  });

  test('words that merely contain a risky command are fine', () => {
    expect(reviewPaste('pseudo-code --format json').risks).toEqual([]);
  });
});
