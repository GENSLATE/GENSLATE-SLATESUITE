import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { mergeConfig, type PluginOption, type UserConfig } from 'vite';

import { buildTarget, type Env, readTauriEnv } from './tauri.env';

/** Options accepted by `reactCompilerPreset()` (e.g. `{ compilationMode: 'annotation' }`). */
export type ReactCompilerOptions = NonNullable<Parameters<typeof reactCompilerPreset>[0]>;

export interface TauriViteOptions {
  /** Fixed dev-server port for this app (`devUrl` in tauri.conf.json must match). */
  readonly port: number;
  /** HMR WebSocket port when `TAURI_DEV_HOST` is set. Default: `port + 1`. */
  readonly hmrPort?: number;
  /** React Compiler via Babel. Default: `true`. */
  readonly reactCompiler?: boolean | ReactCompilerOptions;
  /** Tailwind CSS v4 Vite plugin. Default: `true`. */
  readonly tailwind?: boolean;
  /** Extra plugins, appended after the preset's. */
  readonly plugins?: readonly PluginOption[];
  /** Deep-merged over the generated config (`mergeConfig`). */
  readonly overrides?: UserConfig;
  /** Environment to read `TAURI_*` from. Default: `process.env`. */
  readonly env?: Env;
}

/**
 * The shared Vite 8 config for GENSLATE Tauri apps.
 *
 * ```ts
 * // desktop/<app>/vite.config.ts
 * import { defineTauriViteConfig } from '@genslate/config-vite';
 * export default defineTauriViteConfig({ port: 1420 });
 * ```
 */
export function defineTauriViteConfig(options: TauriViteOptions): UserConfig {
  const { port, reactCompiler = true, tailwind = true } = options;
  if (!Number.isInteger(port) || port < 1024 || port > 65_534) {
    throw new RangeError(
      `defineTauriViteConfig: port must be an integer in 1024..65534, got ${port}`,
    );
  }
  const hmrPort = options.hmrPort ?? port + 1;
  const tauri = readTauriEnv(options.env ?? process.env);
  const target = buildTarget(tauri.platform);

  const plugins: PluginOption[] = [react()];
  if (reactCompiler !== false) {
    const presetOptions = reactCompiler === true ? undefined : reactCompiler;
    plugins.push(babel({ presets: [reactCompilerPreset(presetOptions)] }));
  }
  if (tailwind) plugins.push(tailwindcss());
  plugins.push(...(options.plugins ?? []));

  const config: UserConfig = {
    plugins,
    // Keep Rust compiler errors visible in the terminal.
    clearScreen: false,
    // Expose `TAURI_ENV_*` (platform, arch, debug…) to the frontend alongside `VITE_*`.
    envPrefix: ['VITE_', 'TAURI_ENV_'],
    server: {
      port,
      // Tauri expects the fixed `devUrl` port; fail instead of silently moving.
      strictPort: true,
      host: tauri.devHost ?? false,
      ...(tauri.devHost === undefined
        ? {}
        : { hmr: { protocol: 'ws', host: tauri.devHost, port: hmrPort } }),
      // Cargo writes to src-tauri/target; never let it trigger reloads.
      watch: { ignored: ['**/src-tauri/**'] },
    },
    preview: { port, strictPort: true },
    build: {
      ...(target === undefined ? {} : { target }),
      // Debug builds (`tauri dev`, `tauri build --debug`) stay readable.
      minify: !tauri.debug,
      sourcemap: tauri.debug,
      emptyOutDir: true,
    },
  };

  return options.overrides === undefined ? config : mergeConfig(config, options.overrides);
}
