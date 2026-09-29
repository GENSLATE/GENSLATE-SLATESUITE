import { describe, expect, test } from 'bun:test';

import { binaryBytes, concatBytes, utf8Bytes } from '../../../src/model/bytes.util';

describe('shell input bytes', () => {
  test('text is UTF-8', () => {
    expect([...utf8Bytes('é\r')]).toEqual([0xc3, 0xa9, 0x0d]);
  });

  test('binary input keeps one byte per character', () => {
    // A legacy X10 mouse report at column 200: ESC [ M, button, x + 32, y + 32.
    const report = `\x1b[M ${String.fromCharCode(232)}!`;
    expect([...binaryBytes(report)]).toEqual([0x1b, 0x5b, 0x4d, 0x20, 232, 0x21]);
  });

  test('chunks join in order', () => {
    expect([...concatBytes([Uint8Array.of(1, 2), Uint8Array.of(), Uint8Array.of(3)])]).toEqual([
      1, 2, 3,
    ]);
    const only = Uint8Array.of(9);
    expect(concatBytes([only])).toBe(only);
  });
});
