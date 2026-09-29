//! `get_context` (everything the UI needs at start) and `set_setting`.

use genslate_core_terminal::TerminalSettings;
use genslate_core_terminal::config::{self, SettingValue};
use genslate_core_terminal::profiles::{self, Platform, Profile};
use genslate_core_terminal::snippets::{self, Snippet};
use serde::Serialize;
use tauri::State;

use crate::AppError;
use crate::state::Terminal;

/// `TerminalContext`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalContext {
    pub platform: Platform,
    pub home: Option<String>,
    pub profiles: Vec<Profile>,
    /// `--profile` from the first launch, else the `default-profile` setting, else the first.
    pub default_profile_id: String,
    pub settings: TerminalSettings,
    pub snippets: Vec<Snippet>,
    /// `--cwd` from the first launch.
    pub start_cwd: Option<String>,
    /// `false` when the history database could not open.
    pub history_enabled: bool,
}

#[tauri::command(async)]
pub fn get_context(terminal: State<'_, Terminal>) -> TerminalContext {
    let settings = terminal.settings();
    let profiles = terminal.profiles();
    let default_profile_id = terminal
        .launch
        .profile_id
        .clone()
        .filter(|id| profiles.iter().any(|profile| &profile.id == id))
        .unwrap_or_else(|| profiles::default_profile_id(&settings, &profiles));
    let snippets = snippets::load(&terminal.snippets_file()).unwrap_or_else(|error| {
        log::warn!("snippets: {error}");
        Vec::new()
    });
    TerminalContext {
        platform: Platform::current(),
        home: dirs::home_dir().map(|home| home.to_string_lossy().into_owned()),
        profiles,
        default_profile_id,
        settings,
        snippets,
        start_cwd: terminal.launch.cwd.clone(),
        history_enabled: terminal.history.is_some(),
    }
}

/// Writes one `[terminal]` key to `config.toml` (keeping its comments) and returns the new
/// settings. An invalid key or value is an error and nothing is written.
#[tauri::command(async)]
pub fn set_setting(
    terminal: State<'_, Terminal>,
    key: String,
    value: SettingValue,
) -> Result<TerminalSettings, AppError> {
    let updated = config::write_setting(&terminal.paths.config_file, &key, &value)?;
    let settings = updated.terminal.clone();
    terminal.set_config(updated);
    Ok(settings)
}
