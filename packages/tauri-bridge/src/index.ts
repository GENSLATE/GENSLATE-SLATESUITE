/**
 * @genslate/tauri-bridge — typed, tree-shakeable access to Tauri 2 from React.
 * Every API is a safe no-op (or a sensible web fallback) in a plain browser.
 */
export { useAppInfo } from './ipc/app-info.hook';
export type { AppInfo } from './ipc/app-info.types';
export { channelBytes, createChannel, type IpcChannel } from './ipc/channel';
export { type CommandError, isCommandError } from './ipc/command-error.types';
export { commands } from './ipc/commands';
export {
  customSchemeUrl,
  invokeBytes,
  invokeCommand,
  listenEvent,
  UNAVAILABLE,
} from './ipc/invoke';
export { detectPlatform, type Platform } from './platform/platform.detect';
export { isTauri } from './runtime/runtime.detect';
export { type NativeTheme, setNativeTheme } from './theme/native-theme';
export { useSystemTheme } from './theme/system-theme.hook';
export { useWindowControls, type WindowControls } from './window/window-controls.hook';
