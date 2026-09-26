import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

import {
  commands,
  detectPlatform,
  isTauri,
  setNativeTheme,
  useSystemTheme,
  useWindowControls,
} from '../../src';

// happy-dom is a plain browser: no `window.isTauri`, no `__TAURI_INTERNALS__`.
describe('in a plain browser', () => {
  afterEach(() => {
    // Restore spies created with spyOn.
    for (const spy of spies.splice(0)) spy.mockRestore();
  });
  const spies: { mockRestore(): void }[] = [];

  test('isTauri() is false and the platform is web', () => {
    expect(isTauri()).toBe(false);
    expect(detectPlatform()).toBe('web');
  });

  test('commands.appInfo() resolves to null', async () => {
    expect(await commands.appInfo()).toBeNull();
  });

  test('commands.openExternal() opens a new tab without an opener', async () => {
    const open = spyOn(window, 'open').mockImplementation(() => null);
    spies.push(open);
    await commands.openExternal('https://www.nordtheme.com/docs/colors-and-palettes');
    expect(open).toHaveBeenCalledWith(
      'https://www.nordtheme.com/docs/colors-and-palettes',
      '_blank',
      'noopener,noreferrer',
    );
  });

  test('commands.openExternal() rejects non-web protocols', async () => {
    const open = spyOn(window, 'open').mockImplementation(() => null);
    spies.push(open);
    await expect(commands.openExternal('javascript:alert(1)')).rejects.toThrow(TypeError);
    await expect(commands.openExternal('file:///etc/passwd')).rejects.toThrow(TypeError);
    expect(open).not.toHaveBeenCalled();
  });

  test('setNativeTheme() is a no-op', async () => {
    await expect(setNativeTheme('light')).resolves.toBeUndefined();
    await expect(setNativeTheme(null)).resolves.toBeUndefined();
  });

  test('useWindowControls() actions are no-ops and state follows the document', async () => {
    const { result } = renderHook(() => useWindowControls());
    expect(result.current.isMaximized).toBe(false);
    expect(result.current.isFullscreen).toBe(false);

    await act(async () => {
      await result.current.minimize();
      await result.current.toggleMaximize();
      await result.current.startDragging();
      await result.current.close();
    });
    expect(result.current.isMaximized).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(result.current.isFocused).toBe(false);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(result.current.isFocused).toBe(true);
  });

  test('useWindowControls() keeps stable action identities across renders', () => {
    const { result, rerender } = renderHook(() => useWindowControls());
    const first = result.current;
    rerender();
    expect(result.current.minimize).toBe(first.minimize);
    expect(result.current).toBe(first);
  });

  test('useWindowControls() removes its listeners on unmount', () => {
    const remove = spyOn(window, 'removeEventListener');
    spies.push(remove);
    const { unmount } = renderHook(() => useWindowControls());
    unmount();
    const removed = remove.mock.calls.map(([type]) => type);
    expect(removed).toEqual(expect.arrayContaining(['focus', 'blur']));
  });

  test('useSystemTheme() follows prefers-color-scheme', () => {
    const expected = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const { result } = renderHook(() => useSystemTheme());
    expect(result.current).toBe(expected);
  });
});
