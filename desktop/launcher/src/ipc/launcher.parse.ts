/**
 * Boundary checks for IPC payloads: cheap structural validation so a mismatched Rust/TS pair
 * fails loudly at the edge instead of deep inside a component.
 */
import type {
  AppEntry,
  AppList,
  LauncherContext,
  Settings,
  TabInfo,
  Telemetry,
  VolumeInfo,
} from './launcher.types';

/** Thrown when a payload doesn't have the expected shape. */
export class PayloadError extends Error {
  constructor(what: string) {
    super(`Unexpected ${what} from the launcher backend`);
    this.name = 'PayloadError';
  }
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function array(value: unknown, what: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new PayloadError(what);
  return value;
}

function isAppEntry(value: unknown): value is AppEntry {
  return (
    isObject(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['status'] === 'string' &&
    typeof value['favorite'] === 'boolean' &&
    Array.isArray(value['keywords'])
  );
}

function isTab(value: unknown): value is TabInfo {
  return (
    isObject(value) && typeof value['source'] === 'string' && typeof value['count'] === 'number'
  );
}

export function parseAppList(value: unknown): AppList {
  if (!isObject(value)) throw new PayloadError('app list');
  const json = value;
  const apps = array(json['apps'], 'apps');
  if (!apps.every(isAppEntry)) throw new PayloadError('app entry');
  const tabs = array(json['tabs'], 'tabs');
  const recent = array(json['recent'], 'recent apps');
  if (!tabs.every(isTab)) throw new PayloadError('tab');
  return {
    apps,
    tabs,
    recent: recent.filter((id): id is string => typeof id === 'string'),
  };
}

function isContext(value: unknown): value is LauncherContext {
  if (!isObject(value)) return false;
  const { settings, layout, actions, version, mode } = value;
  return (
    typeof version === 'string' &&
    typeof mode === 'string' &&
    Array.isArray(actions) &&
    isObject(layout) &&
    typeof layout['inset'] === 'number' &&
    isObject(settings) &&
    isObject(settings['config']) &&
    isObject(settings['keybindings'])
  );
}

export function parseContext(value: unknown): LauncherContext {
  if (!isContext(value)) throw new PayloadError('context');
  return value;
}

function isVolume(value: unknown): value is VolumeInfo {
  return (
    isObject(value) &&
    typeof value['label'] === 'string' &&
    typeof value['totalBytes'] === 'number' &&
    typeof value['availableBytes'] === 'number'
  );
}

export function parseVolume(value: unknown): VolumeInfo | null {
  if (value === null) return null;
  if (!isVolume(value)) throw new PayloadError('volume');
  return value;
}

const TELEMETRY_KEYS = [
  'cpuTempC',
  'gpuTempC',
  'cpuUsagePct',
  'gpuUsagePct',
  'netDownBps',
  'netUpBps',
] as const;

export function parseTelemetry(value: unknown): Telemetry {
  if (!isObject(value)) throw new PayloadError('telemetry');
  const json = value;
  const read = (key: (typeof TELEMETRY_KEYS)[number]) => {
    const reading = json[key];
    return typeof reading === 'number' && Number.isFinite(reading) ? reading : null;
  };
  return {
    cpuTempC: read('cpuTempC'),
    gpuTempC: read('gpuTempC'),
    cpuUsagePct: read('cpuUsagePct'),
    gpuUsagePct: read('gpuUsagePct'),
    netDownBps: read('netDownBps'),
    netUpBps: read('netUpBps'),
  };
}

function isSettings(value: unknown): value is Settings {
  return isObject(value) && isObject(value['config']) && isObject(value['keybindings']);
}

export function parseSettings(value: unknown): Settings {
  if (!isSettings(value)) throw new PayloadError('settings');
  return value;
}
