/**
 * Reads the `TAURI_*` variables the Tauri CLI sets while running `beforeDevCommand` /
 * `beforeBuildCommand`. https://v2.tauri.app/reference/environment-variables/
 */

/** Environment variables as seen by the Vite config (`process.env`). */
export type Env = Readonly<Record<string, string | undefined>>;

/** The parts of the Tauri CLI environment that shape the Vite config. */
export interface TauriEnv {
  /** Running under `tauri dev` / `tauri build` (vs. a plain `vite` in a browser). */
  readonly isTauri: boolean;
  /** `TAURI_ENV_PLATFORM`: `darwin`, `windows`, `linux`, `ios`, `android`. */
  readonly platform: string | undefined;
  /** `TAURI_ENV_DEBUG`: debug build (`tauri dev` or `tauri build --debug`). */
  readonly debug: boolean;
  /** `TAURI_DEV_HOST`: set for mobile/remote devices; the dev server must bind to it. */
  readonly devHost: string | undefined;
}

export function readTauriEnv(env: Env): TauriEnv {
  const platform = nonEmpty(env['TAURI_ENV_PLATFORM']);
  return {
    isTauri: platform !== undefined,
    platform,
    debug: env['TAURI_ENV_DEBUG'] === 'true',
    devHost: nonEmpty(env['TAURI_DEV_HOST']),
  };
}

/**
 * esbuild/oxc build target for the platform's WebView: WebView2 (evergreen Chromium) on
 * Windows, WebKit (WKWebView / WebKitGTK) elsewhere. `undefined` keeps Vite's default for
 * browser builds.
 */
export function buildTarget(platform: string | undefined): string | undefined {
  if (platform === undefined) return undefined;
  return platform === 'windows' ? 'chrome120' : 'safari16.4';
}

function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value;
}
