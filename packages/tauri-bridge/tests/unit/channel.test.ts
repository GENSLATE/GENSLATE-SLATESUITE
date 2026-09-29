import { describe, expect, test } from 'bun:test';

import { channelBytes, createChannel } from '../../src';

describe('channels', () => {
  test('createChannel() is null in a plain browser', () => {
    expect(createChannel(() => undefined)).toBeNull();
  });

  test('channelBytes() reads every binary shape a channel delivers', () => {
    const bytes = [104, 105];
    expect(channelBytes(new Uint8Array(bytes).buffer)).toEqual(new Uint8Array(bytes));
    expect(channelBytes(new Uint8Array(bytes))).toEqual(new Uint8Array(bytes));
    expect(channelBytes(new DataView(new Uint8Array([0, 104, 105]).buffer, 1))).toEqual(
      new Uint8Array(bytes),
    );
    expect(channelBytes(bytes)).toEqual(new Uint8Array(bytes));
  });

  test('channelBytes() rejects anything else', () => {
    expect(channelBytes('hi')).toBeNull();
    expect(channelBytes(['h'])).toBeNull();
    expect(channelBytes(null)).toBeNull();
  });
});
