/**
 * @genslate/config-vite — the shared Vite 8 preset for GENSLATE Tauri apps:
 * React (+ React Compiler), Tailwind CSS v4 and the Tauri dev-server contract.
 */

export { buildTarget, type Env, readTauriEnv, type TauriEnv } from './tauri.env';
export {
  defineTauriViteConfig,
  type ReactCompilerOptions,
  type TauriViteOptions,
} from './tauri-vite.config';
