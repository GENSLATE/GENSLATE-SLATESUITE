//! IPC commands. Thin: validate input, delegate to `genslate-core-launcher` / shell modules.
//! The UI sends app **ids**, folder and file **names** — never paths.

use std::sync::atomic::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};

use genslate_core_launcher::actions::{ACTIONS, ActionSpec};
use genslate_core_launcher::catalog::{AppEntry, AppId, TabInfo};
use genslate_core_launcher::geometry::{EXPANDED_FRAME_WIDTH, FRAME_INSET, NORMAL_FRAME_WIDTH};
use genslate_core_launcher::launch::LaunchSpec;
use genslate_core_launcher::metadata::{self, OverridePatch};
use genslate_core_launcher::system::{self, VolumeInfo};
use genslate_paths::Mode;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

use crate::files::{self, ConfigFile, SharedFolder};
use crate::reload::emit;
use crate::state::{Launcher, Settings, recent_file};
use crate::{AppError, events, window};

/// Everything the UI needs at start.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherContext {
    pub version: String,
    /// `suite` · `dev` · `standalone` · `fallback`
    pub mode: &'static str,
    /// The install folder's name (shown under the profile).
    pub suite_name: Option<String>,
    pub profile: &'static str,
    pub settings: Settings,
    pub pinned: bool,
    pub actions: &'static [ActionSpec],
    pub layout: FrameLayout,
}

/// Frame geometry shared with the CSS (so hit-testing and drawing agree).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameLayout {
    pub inset: f64,
    pub normal_width: f64,
    pub expanded_width: f64,
}

#[tauri::command]
pub fn get_context(app: AppHandle, launcher: State<'_, Launcher>) -> LauncherContext {
    let layout = &launcher.paths.layout;
    LauncherContext {
        version: app.package_info().version.to_string(),
        mode: match layout.mode {
            Mode::Suite => "suite",
            Mode::Dev => "dev",
            Mode::Standalone => "standalone",
            Mode::Fallback => "fallback",
        },
        suite_name: layout.name().map(str::to_owned),
        profile: "Shared",
        settings: launcher.settings().clone(),
        pinned: launcher.window().pinned,
        actions: ACTIONS,
        layout: FrameLayout {
            inset: FRAME_INSET,
            normal_width: NORMAL_FRAME_WIDTH,
            expanded_width: EXPANDED_FRAME_WIDTH,
        },
    }
}

/// The catalog as the UI shows it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppList {
    pub apps: Vec<AppEntry>,
    pub tabs: Vec<TabInfo>,
    /// Recently launched ids, newest first.
    pub recent: Vec<AppId>,
}

#[tauri::command]
pub fn list_apps(launcher: State<'_, Launcher>) -> AppList {
    let catalog = launcher.catalog();
    AppList {
        apps: catalog.apps().to_vec(),
        tabs: catalog.tabs(),
        recent: launcher.recent().latest(8),
    }
}

#[tauri::command]
pub fn rescan(app: AppHandle, launcher: State<'_, Launcher>) {
    launcher.rescan();
    emit(&app, events::CATALOG, ());
}

#[tauri::command]
pub fn launch_app(app: AppHandle, id: String, args: Option<Vec<String>>) -> Result<(), AppError> {
    launch(&app, &parse_id(&id)?, args)
}

/// Launches `id`, records it as recent and hides the launcher unless pinned.
pub fn launch(app: &AppHandle, id: &AppId, args: Option<Vec<String>>) -> Result<(), AppError> {
    let launcher = app.state::<Launcher>();
    let entry = launcher
        .catalog()
        .find(id)
        .cloned()
        .ok_or_else(|| genslate_core_launcher::LauncherError::UnknownApp(id.to_string()))?;
    let spec = LaunchSpec::resolve(&entry, args, &launcher.allowed_roots, launcher.roots.host)?;
    let pid = spec.spawn()?;
    log::info!("launched {id} (pid {pid})");
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| elapsed.as_secs());
    if let Err(error) = launcher
        .recent()
        .record(id.clone(), now, &recent_file(&launcher.paths))
    {
        log::warn!("recent launches: {error}");
    }
    emit(app, events::CATALOG, ());
    let pinned = launcher.window().pinned;
    if !pinned && launcher.settings().config.behavior.hide_on_launch {
        window::hide(app)?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_app_folder(app: AppHandle, id: String) -> Result<(), AppError> {
    files::open_app_folder(&app, &parse_id(&id)?)
}

#[tauri::command]
pub fn set_app_override(app: AppHandle, id: String, patch: OverridePatch) -> Result<(), AppError> {
    apply_override(&app, &parse_id(&id)?, &patch)
}

/// Writes an override (comments kept), rescans and tells the UI.
pub fn apply_override(app: &AppHandle, id: &AppId, patch: &OverridePatch) -> Result<(), AppError> {
    let launcher = app.state::<Launcher>();
    let text = metadata::write_override(&launcher.paths.metadata_dir, id.source, &id.key, patch)?;
    launcher.self_writes.record(
        &launcher.paths.metadata_dir.join(id.source.settings_file()),
        &text,
    );
    launcher.rescan();
    emit(app, events::CATALOG, ());
    Ok(())
}

#[tauri::command]
pub fn open_folder(app: AppHandle, folder: SharedFolder) -> Result<(), AppError> {
    files::open_shared_folder(&app, folder)
}

#[tauri::command]
pub fn open_config_file(app: AppHandle, file: ConfigFile) -> Result<(), AppError> {
    files::open_config(&app, file)
}

/// A setting the UI may change (written to config.toml; the file watcher applies it).
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SettingKey {
    Theme,
    Size,
    StatusMode,
}

#[tauri::command]
pub fn set_setting(
    launcher: State<'_, Launcher>,
    key: SettingKey,
    value: String,
) -> Result<(), AppError> {
    write_setting(&launcher, key, &value)
}

/// Validates and writes one setting, keeping the file's comments.
pub fn write_setting(launcher: &Launcher, key: SettingKey, value: &str) -> Result<(), AppError> {
    let (table, name, allowed): (&str, &str, &[&str]) = match key {
        SettingKey::Theme => (
            "appearance",
            "theme",
            &["system", "polar-night", "snow-storm"],
        ),
        SettingKey::Size => ("appearance", "size", &["s", "m", "l"]),
        SettingKey::StatusMode => ("status", "mode", &["temps", "usage"]),
    };
    if !allowed.contains(&value) {
        return Err(AppError::InvalidArgument(format!(
            "{name} must be one of {}",
            allowed.join(", ")
        )));
    }
    metadata::write_value(&launcher.paths.config_file, table, name, value.into())?;
    Ok(())
}

#[tauri::command]
pub fn get_volume_info(launcher: State<'_, Launcher>) -> Option<VolumeInfo> {
    system::volume_for(&launcher.paths.layout.root)
}

#[tauri::command]
pub fn set_telemetry_active(launcher: State<'_, Launcher>, active: bool) {
    launcher.telemetry_active.store(active, Ordering::Relaxed);
}

#[tauri::command]
pub fn window_set_pinned(app: AppHandle, pinned: bool) -> Result<(), AppError> {
    window::set_pinned(&app, pinned)
}

#[tauri::command]
pub fn window_set_expanded(app: AppHandle, expanded: bool) {
    window::set_expanded(&app, expanded);
}

#[tauri::command]
pub fn window_set_popup_open(app: AppHandle, open: bool) {
    window::set_popup(&app, open);
}

#[tauri::command]
pub fn window_hide(app: AppHandle) -> Result<(), AppError> {
    window::hide(&app)
}

#[tauri::command]
pub fn quit(app: AppHandle) {
    app.exit(0);
}

pub fn parse_id(id: &str) -> Result<AppId, AppError> {
    id.parse().map_err(AppError::InvalidArgument)
}
