/**
 * @genslate/tauri-bridge — typed, tree-shakeable access to Tauri 2 from React.
 * Every API is a safe no-op (or a sensible web fallback) in a plain browser.
 */
export type { AppInfo } from './ipc/app-info.types';
export { type CommandError, isCommandError } from './ipc/command-error.types';
export { commands } from './ipc/commands';
export { detectPlatform, type Platform } from './platform/platform.detect';
export { isTauri } from './runtime/runtime.detect';
export { type NativeTheme, setNativeTheme } from './theme/native-theme';
export { useSystemTheme } from './theme/system-theme.hook';
export { useWindowControls, type WindowControls } from './window/window-controls.hook';
