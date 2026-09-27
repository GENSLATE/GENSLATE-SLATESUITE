/**
 * The launcher backend: typed calls into `src-tauri/src/commands.rs` through
 * `@genslate/tauri-bridge`, or an in-memory mock when the UI runs in a plain browser
 * (`bun x moon run launcher:web-dev`) so it can be designed and screenshot anywhere.
 */
import { customSchemeUrl, invokeCommand, isTauri, listenEvent } from '@genslate/tauri-bridge';

import {
  parseAppList,
  parseContext,
  parseSettings,
  parseTelemetry,
  parseVolume,
} from './launcher.parse';
import type {
  ActionOutcome,
  AppList,
  ConfigFile,
  LauncherContext,
  LauncherEvents,
  OverridePatch,
  SettingKey,
  SharedFolder,
  VolumeInfo,
} from './launcher.types';

/** Everything the UI can ask of the shell. */
export interface LauncherBackend {
  context(): Promise<LauncherContext>;
  listApps(): Promise<AppList>;
  rescan(): Promise<void>;
  launch(id: string, args?: readonly string[]): Promise<void>;
  openAppFolder(id: string): Promise<void>;
  setOverride(id: string, patch: OverridePatch): Promise<void>;
  openFolder(folder: SharedFolder): Promise<void>;
  openConfigFile(file: ConfigFile): Promise<void>;
  setSetting(key: SettingKey, value: string): Promise<void>;
  volume(): Promise<VolumeInfo | null>;
  setTelemetryActive(active: boolean): Promise<void>;
  setPinned(pinned: boolean): Promise<void>;
  setExpanded(expanded: boolean): Promise<void>;
  setPopupOpen(open: boolean): Promise<void>;
  hide(): Promise<void>;
  quit(): Promise<void>;
  runAction(id: string, params: Readonly<Record<string, string>>): Promise<ActionOutcome>;
  on<E extends keyof LauncherEvents>(
    event: E,
    handler: (payload: LauncherEvents[E]) => void,
  ): Promise<() => void>;
  iconUrl(id: string): string;
}

const EVENT_NAMES: { readonly [E in keyof LauncherEvents]: string } = {
  shown: 'launcher://shown',
  willHide: 'launcher://will-hide',
  pinned: 'launcher://pinned',
  settings: 'launcher://settings',
  catalog: 'launcher://catalog',
  telemetry: 'launcher://telemetry',
};

/** Payload parsers per event (events with no payload pass `undefined`). */
const EVENT_PARSERS: { readonly [E in keyof LauncherEvents]: (raw: unknown) => LauncherEvents[E] } =
  {
    shown: () => undefined,
    willHide: () => undefined,
    pinned: (raw) => raw === true,
    settings: parseSettings,
    catalog: () => undefined,
    telemetry: parseTelemetry,
  };

const tauriBackend: LauncherBackend = {
  context: async () => parseContext(await invokeCommand<unknown>('get_context')),
  listApps: async () => parseAppList(await invokeCommand<unknown>('list_apps')),
  rescan: () => invokeCommand('rescan'),
  launch: (id, args) => invokeCommand('launch_app', { id, args: args ?? null }),
  openAppFolder: (id) => invokeCommand('open_app_folder', { id }),
  setOverride: (id, patch) => invokeCommand('set_app_override', { id, patch }),
  openFolder: (folder) => invokeCommand('open_folder', { folder }),
  openConfigFile: (file) => invokeCommand('open_config_file', { file }),
  setSetting: (key, value) => invokeCommand('set_setting', { key, value }),
  volume: async () => parseVolume(await invokeCommand<unknown>('get_volume_info')),
  setTelemetryActive: (active) => invokeCommand('set_telemetry_active', { active }),
  setPinned: (pinned) => invokeCommand('window_set_pinned', { pinned }),
  setExpanded: (expanded) => invokeCommand('window_set_expanded', { expanded }),
  setPopupOpen: (open) => invokeCommand('window_set_popup_open', { open }),
  hide: () => invokeCommand('window_hide'),
  quit: () => invokeCommand('quit'),
  runAction: (id, params) => invokeCommand<ActionOutcome>('run_action', { id, params }),
  on: (event, handler) =>
    listenEvent<unknown>(EVENT_NAMES[event], (raw) => handler(EVENT_PARSERS[event](raw))),
  iconUrl: (id) => customSchemeUrl('launcher-icon', id.split('/')),
};

/** The Tauri backend inside the desktop app, the mock in a browser. */
export async function createBackend(): Promise<LauncherBackend> {
  if (isTauri()) return tauriBackend;
  const { createMockBackend } = await import('./launcher.mock');
  return createMockBackend();
}
