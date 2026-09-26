import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearMocks, mockIPC, mockWindows } from '@tauri-apps/api/mocks';
import { act, renderHook, waitFor } from '@testing-library/react';

import { commands, detectPlatform, isTauri, setNativeTheme, useWindowControls } from '../../src';

type TauriGlobals = typeof globalThis & {
  isTauri?: boolean;
  __TAURI_OS_PLUGIN_INTERNALS__?: { platform: string };
};
const globals = globalThis as TauriGlobals;

const APP_INFO = {
  name: 'GENSLATE Example',
  version: '0.1.0',
  tauriVersion: '2.11.6',
  os: 'linux',
  arch: 'x86_64',
  debug: true,
};

describe('inside Tauri (mocked IPC)', () => {
  let calls: { cmd: string; payload: unknown }[];

  beforeEach(() => {
    calls = [];
    globals.isTauri = true;
    mockWindows('main');
    mockIPC(
      (cmd, payload) => {
        calls.push({ cmd, payload });
        switch (cmd) {
          case 'get_app_info':
            return APP_INFO;
          case 'plugin:window|is_maximized':
            return true;
          case 'plugin:window|is_fullscreen':
          case 'plugin:window|is_focused':
            return false;
          default:
            return null;
        }
      },
      { shouldMockEvents: true },
    );
  });

  afterEach(() => {
    clearMocks();
    delete globals.isTauri;
    delete globals.__TAURI_OS_PLUGIN_INTERNALS__;
  });

  test('isTauri() is true', () => {
    expect(isTauri()).toBe(true);
  });

  test('detectPlatform() maps the OS plugin value', () => {
    globals.__TAURI_OS_PLUGIN_INTERNALS__ = { platform: 'macos' };
    expect(detectPlatform()).toBe('macos');
    globals.__TAURI_OS_PLUGIN_INTERNALS__ = { platform: 'windows' };
    expect(detectPlatform()).toBe('windows');
    globals.__TAURI_OS_PLUGIN_INTERNALS__ = { platform: 'freebsd' };
    expect(detectPlatform()).toBe('linux');
  });

  test('detectPlatform() falls back to the user agent without the OS plugin', () => {
    expect(['macos', 'windows', 'linux']).toContain(detectPlatform());
  });

  test('commands.appInfo() invokes get_app_info', async () => {
    expect(await commands.appInfo()).toEqual(APP_INFO);
    expect(calls.map((call) => call.cmd)).toContain('get_app_info');
  });

  test('commands.openExternal() goes through the opener plugin', async () => {
    await commands.openExternal('https://example.com/');
    expect(calls.find((call) => call.cmd === 'plugin:opener|open_url')?.payload).toMatchObject({
      url: 'https://example.com/',
    });
  });

  test('setNativeTheme() sets the window theme', async () => {
    await setNativeTheme('light');
    expect(calls.find((call) => call.cmd === 'plugin:window|set_theme')?.payload).toMatchObject({
      value: 'light',
    });
  });

  test('useWindowControls() reads native state and forwards actions', async () => {
    const { result, unmount } = renderHook(() => useWindowControls());
    await waitFor(() => {
      expect(result.current.isMaximized).toBe(true);
    });
    expect(result.current.isFocused).toBe(false);

    await act(async () => {
      await result.current.minimize();
      await result.current.toggleMaximize();
    });
    const commandsSent = calls.map((call) => call.cmd);
    expect(commandsSent).toContain('plugin:window|minimize');
    expect(commandsSent).toContain('plugin:window|toggle_maximize');
    unmount();
  });
});
