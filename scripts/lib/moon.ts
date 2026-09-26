import { log } from './log';
import { capture, run } from './run';

let available: Promise<boolean> | undefined;

/**
 * `true` when moon can load the workspace (it downloads its WASM toolchain plugins on first
 * use, which fails offline). Commands fall back to running bun/cargo directly when `false`.
 * Set `GENSLATE_NO_MOON=1` to force the fallback.
 */
export function moonAvailable(): Promise<boolean> {
  available ??= (async () => {
    if (process.env['GENSLATE_NO_MOON'] === '1') return false;
    const result = await capture(['bunx', 'moon', 'query', 'projects', '--json']);
    if (result.code !== 0) {
      log.warn('moon cannot load the workspace here (offline?); running tools directly.');
    }
    return result.code === 0;
  })();
  return available;
}

/** `moon run <targets...>` (with inherited stdio). */
export async function moonRun(
  targets: readonly string[],
  extra: readonly string[] = [],
): Promise<number> {
  return await run(['bunx', 'moon', 'run', ...targets, ...extra]);
}
