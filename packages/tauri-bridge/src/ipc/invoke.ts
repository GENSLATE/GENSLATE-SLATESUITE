import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { detectPlatform } from '../platform/platform.detect';
import { isTauri } from '../runtime/runtime.detect';
import type { CommandError } from './command-error.types';

/** Rejection of `invokeCommand` outside Tauri. */
export const UNAVAILABLE: CommandError = {
  kind: 'unavailable',
  message: 'This needs the desktop app (not available in a browser).',
};

/**
 * Calls an app-defined Rust command. Apps wrap this in their own typed client and parse the
 * result at the boundary. Outside Tauri it rejects with {@link UNAVAILABLE}.
 */
export async function invokeCommand<T>(
  command: string,
  args?: Readonly<Record<string, unknown>>,
): Promise<T> {
  if (!isTauri()) throw UNAVAILABLE;
  return await invoke<T>(command, args === undefined ? undefined : { ...args });
}

/**
 * Subscribes to an event emitted by the Rust side. Resolves to an unsubscribe function;
 * outside Tauri nothing is ever emitted and unsubscribing is a no-op.
 */
export async function listenEvent<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  if (!isTauri()) return () => {};
  return await listen<T>(event, (message) => handler(message.payload));
}

/**
 * URL of a custom URI scheme registered by the app (`register_uri_scheme_protocol`), e.g.
 * `customSchemeUrl('launcher-icon', ['genslate', 'explorer'])`. WebView2 (Windows) serves
 * custom schemes as `http://<scheme>.localhost/…`; WebKit uses `<scheme>://localhost/…`.
 * Every path segment is percent-encoded, so ids with `#` or spaces survive.
 */
export function customSchemeUrl(scheme: string, segments: readonly string[]): string {
  const path = segments.map((segment) => encodeURIComponent(segment)).join('/');
  return detectPlatform() === 'windows'
    ? `http://${scheme}.localhost/${path}`
    : `${scheme}://localhost/${path}`;
}
