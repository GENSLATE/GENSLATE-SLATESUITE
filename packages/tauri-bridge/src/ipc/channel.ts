import { Channel } from '@tauri-apps/api/core';

import { isTauri } from '../runtime/runtime.detect';

/**
 * A stream from a Rust command to the page (`tauri::ipc::Channel`): pass it as a command
 * argument and the command sends messages through it for as long as it likes. Ordered.
 */
export type IpcChannel = Channel<unknown>;

/**
 * Opens a channel whose messages go to `onMessage`. Outside Tauri there is nothing to stream
 * from, so it returns `null`.
 */
export function createChannel(onMessage: (message: unknown) => void): IpcChannel | null {
  if (!isTauri()) return null;
  return new Channel<unknown>(onMessage);
}

/**
 * The bytes of a binary channel message (`InvokeResponseBody::Raw` on the Rust side), which
 * arrives as an `ArrayBuffer`, a typed array or, for small payloads, an array of numbers.
 * `null` for anything else.
 */
export function channelBytes(message: unknown): Uint8Array | null {
  if (message instanceof ArrayBuffer) return new Uint8Array(message);
  if (message instanceof Uint8Array) return message;
  if (ArrayBuffer.isView(message)) {
    return new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
  }
  if (Array.isArray(message) && message.every((value) => typeof value === 'number')) {
    return Uint8Array.from(message);
  }
  return null;
}
