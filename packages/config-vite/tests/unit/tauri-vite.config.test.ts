import { describe, expect, test } from 'bun:test';

import { buildTarget, defineTauriViteConfig, readTauriEnv } from '../../src';

const pluginNames = (plugins: unknown): string[] =>
  (plugins as unknown[])
    .flat(Number.POSITIVE_INFINITY)
    .filter(
      (plugin): plugin is { name: string } =>
        typeof plugin === 'object' && plugin !== null && 'name' in plugin,
    )
    .map((plugin) => plugin.name);

describe('readTauriEnv', () => {
  test('plain browser (no TAURI_* vars)', () => {
    expect(readTauriEnv({})).toEqual({
      isTauri: false,
      platform: undefined,
      debug: false,
      devHost: undefined,
    });
  });

  test('tauri dev on macOS', () => {
    const env = readTauriEnv({
      TAURI_ENV_PLATFORM: 'darwin',
      TAURI_ENV_DEBUG: 'true',
      TAURI_DEV_HOST: '',
    });
    expect(env).toEqual({ isTauri: true, platform: 'darwin', debug: true, devHost: undefined });
  });
});

describe('buildTarget', () => {
  test('matches each platform WebView', () => {
    expect(buildTarget('windows')).toBe('chrome120');
    expect(buildTarget('darwin')).toBe('safari16.4');
    expect(buildTarget('linux')).toBe('safari16.4');
    expect(buildTarget(undefined)).toBeUndefined();
  });
});

describe('defineTauriViteConfig', () => {
  test('fixed port, strictPort and the Tauri dev-server contract', () => {
    const config = defineTauriViteConfig({ port: 1420, env: {} });
    expect(config.server?.port).toBe(1420);
    expect(config.server?.strictPort).toBe(true);
    expect(config.server?.host).toBe(false);
    expect(config.server?.hmr).toBeUndefined();
    expect(config.server?.watch?.ignored).toEqual(['**/src-tauri/**']);
    expect(config.clearScreen).toBe(false);
    expect(config.envPrefix).toEqual(['VITE_', 'TAURI_ENV_']);
    expect(config.build?.target).toBeUndefined();
    expect(config.build?.minify).toBe(true);
    expect(config.build?.sourcemap).toBe(false);
  });

  test('TAURI_DEV_HOST binds the server and moves HMR to port + 1', () => {
    const config = defineTauriViteConfig({ port: 1430, env: { TAURI_DEV_HOST: '192.168.1.20' } });
    expect(config.server?.host).toBe('192.168.1.20');
    expect(config.server?.hmr).toEqual({ protocol: 'ws', host: '192.168.1.20', port: 1431 });
  });

  test('debug Windows build: chrome target, no minify, sourcemaps', () => {
    const config = defineTauriViteConfig({
      port: 1420,
      env: { TAURI_ENV_PLATFORM: 'windows', TAURI_ENV_DEBUG: 'true' },
    });
    expect(config.build).toMatchObject({ target: 'chrome120', minify: false, sourcemap: true });
  });

  test('React, React Compiler (Babel) and Tailwind plugins by default', async () => {
    const config = defineTauriViteConfig({ port: 1420, env: {} });
    const plugins = await Promise.all((config.plugins ?? []).map(async (plugin) => await plugin));
    const names = pluginNames(plugins);
    expect(names.some((name) => name.includes('react'))).toBe(true);
    expect(names.includes('@rolldown/plugin-babel')).toBe(true);
    expect(names.some((name) => name.startsWith('@tailwindcss/vite'))).toBe(true);
  });

  test('compiler and tailwind can be turned off; overrides are merged', async () => {
    const config = defineTauriViteConfig({
      port: 1420,
      env: {},
      reactCompiler: false,
      tailwind: false,
      overrides: { server: { open: false } },
    });
    const names = pluginNames(
      await Promise.all((config.plugins ?? []).map(async (plugin) => await plugin)),
    );
    expect(names.includes('@rolldown/plugin-babel')).toBe(false);
    expect(names.some((name) => name.startsWith('@tailwindcss/vite'))).toBe(false);
    expect(config.server?.open).toBe(false);
    expect(config.server?.port).toBe(1420);
  });

  test('rejects invalid ports', () => {
    expect(() => defineTauriViteConfig({ port: 80, env: {} })).toThrow(RangeError);
    expect(() => defineTauriViteConfig({ port: 1420.5, env: {} })).toThrow(RangeError);
  });
});
