/**
 * Types of everything the Rust side sends (`genslate-core-launcher` + `src-tauri/src/commands.rs`).
 * Keep in step with the Rust structs; `launcher.parse.ts` checks payloads at the boundary.
 */

export type Source = 'genslate' | 'portableapps' | 'portapps';

export type AppStatus = 'ready' | 'running' | 'not-installed' | 'missing-exe' | 'broken-manifest';

export interface AppEntry {
  /** `<source>/<key>`, e.g. `genslate/explorer`. */
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  /** Nord token of the icon tile (`nord9`), GENSLATE apps only. */
  readonly color: string | null;
  readonly keywords: readonly string[];
  readonly version: string | null;
  readonly publisher: string | null;
  readonly status: AppStatus;
  readonly favorite: boolean;
  readonly hidden: boolean;
  readonly args: readonly string[];
  readonly hasIcon: boolean;
}

export interface TabInfo {
  readonly source: Source;
  readonly label: string;
  readonly count: number;
}

export interface AppList {
  readonly apps: readonly AppEntry[];
  readonly tabs: readonly TabInfo[];
  /** Recently launched ids, newest first. */
  readonly recent: readonly string[];
}

export type ThemeSetting = 'system' | 'polar-night' | 'snow-storm';
export type SizePreset = 's' | 'm' | 'l';
export type StatusMode = 'temps' | 'usage';

export interface LauncherConfig {
  readonly appearance: { readonly theme: ThemeSetting; readonly size: SizePreset };
  readonly behavior: {
    readonly hideOnBlur: boolean;
    readonly hideOnLaunch: boolean;
    readonly pinned: boolean;
    readonly autostart: boolean;
  };
  readonly status: { readonly mode: StatusMode };
}

export interface LauncherKeys {
  readonly focusSearch: string;
  readonly toggleTools: string;
  readonly togglePin: string;
  readonly toggleFavorite: string;
  readonly tabGenslate: string;
  readonly tabPortableapps: string;
  readonly tabPortapps: string;
}

export interface Keybindings {
  readonly global: { readonly toggle: string };
  readonly launcher: LauncherKeys;
}

export interface Settings {
  readonly config: LauncherConfig;
  readonly keybindings: Keybindings;
  /** Why a settings file was ignored (the previous values stay in use). */
  readonly issue: string | null;
}

export type Effect = 'ui' | 'window' | 'read' | 'launch' | 'open' | 'writes-config' | 'ai';

export type ParamSpec = {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
} & (
  | { readonly type: 'app' }
  | { readonly type: 'choice'; readonly values: readonly string[] }
  | { readonly type: 'text' }
);

export interface ActionSpec {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly params: readonly ParamSpec[];
  readonly effect: Effect;
}

export type RunMode = 'suite' | 'dev' | 'standalone' | 'fallback' | 'web';

export interface FrameLayout {
  /** Transparent border around the frame (logical px). */
  readonly inset: number;
  readonly normalWidth: number;
  readonly expandedWidth: number;
}

export interface LauncherContext {
  readonly version: string;
  readonly mode: RunMode;
  readonly suiteName: string | null;
  readonly profile: string;
  readonly settings: Settings;
  readonly pinned: boolean;
  readonly actions: readonly ActionSpec[];
  readonly layout: FrameLayout;
}

export interface VolumeInfo {
  readonly label: string;
  readonly name: string | null;
  readonly totalBytes: number;
  readonly availableBytes: number;
  readonly removable: boolean;
}

/** `null` = not available on this machine (hidden). */
export interface Telemetry {
  readonly cpuTempC: number | null;
  readonly gpuTempC: number | null;
  readonly cpuUsagePct: number | null;
  readonly gpuUsagePct: number | null;
  readonly netDownBps: number | null;
  readonly netUpBps: number | null;
}

export type SharedFolder =
  | 'desktop'
  | 'documents'
  | 'downloads'
  | 'music'
  | 'pictures'
  | 'videos'
  | 'storage';

export type ConfigFile = 'settings' | 'keybindings' | 'logs';

export type SettingKey = 'theme' | 'size' | 'statusMode' | 'autostart';

/** The view the launcher opens on when the shell shows it. */
export type ShowView = 'apps' | 'help';

/** Where the tray menu window anchors its menu (logical px from the window's top-left). */
export interface TrayMenuAnchor {
  readonly x: number;
  readonly y: number;
  /** Open upwards (tray at the bottom of the screen). */
  readonly opensUp: boolean;
  /** Right-align the menu on the anchor (tray on the right). */
  readonly alignEnd: boolean;
}

/** Absent = keep, `null` = remove. */
export interface OverridePatch {
  readonly favorite?: boolean;
  readonly hidden?: boolean;
  readonly name?: string | null;
  readonly category?: string | null;
  readonly args?: readonly string[] | null;
}

export type ActionOutcome =
  | { readonly kind: 'done'; readonly message: string | null }
  | { readonly kind: 'ui'; readonly id: string };

/** Events from the shell and their payloads. */
export interface LauncherEvents {
  readonly shown: ShowView;
  readonly willHide: undefined;
  readonly pinned: boolean;
  readonly settings: Settings;
  readonly catalog: undefined;
  readonly telemetry: Telemetry;
  /** Tray menu window only: open at this anchor. */
  readonly trayMenuOpen: TrayMenuAnchor;
  /** Tray menu window only: focus left, close. */
  readonly trayMenuClose: undefined;
}
