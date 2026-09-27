//! `run_action`: executes a registry action (`genslate_core_launcher::actions`) by id.
//!
//! This is the single entry point a future AI agent / MCP server will use. UI-only actions
//! (`tab`, `tools`, `help`, `ask`) return [`ActionOutcome::Ui`] so the caller handles them.

use genslate_core_launcher::actions::{self, Effect};
use genslate_core_launcher::catalog::{AppEntry, AppId, AppStatus};
use genslate_core_launcher::metadata::OverridePatch;
use serde::Serialize;
use serde_json::{Map, Value};
use tauri::{AppHandle, Manager};

use crate::commands::{self, SettingKey};
use crate::files::{self, ConfigFile, SharedFolder};
use crate::state::Launcher;
use crate::{AppError, events, reload, window};

/// What happened.
#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum ActionOutcome {
    Done {
        message: Option<String>,
    },
    /// The caller (the UI) performs this action itself.
    Ui {
        id: &'static str,
    },
}

#[tauri::command]
pub fn run_action(
    app: AppHandle,
    id: String,
    params: Map<String, Value>,
) -> Result<ActionOutcome, AppError> {
    let spec = actions::find(&id)?;
    actions::validate(spec, &params)?;
    if matches!(spec.effect, Effect::Ui | Effect::Ai) {
        return Ok(ActionOutcome::Ui { id: spec.id });
    }
    let text = |name: &str| {
        params
            .get(name)
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_owned()
    };
    let launcher = app.state::<Launcher>();
    let message = match spec.id {
        "open" => {
            let app_entry = resolve_app(&launcher, &text("app"))?;
            commands::launch(&app, &app_entry.id, None)?;
            Some(format!("Opened {}", app_entry.name))
        }
        "folder" => {
            let folder = SharedFolder::parse(&text("name"))
                .ok_or_else(|| AppError::InvalidArgument("unknown folder".to_owned()))?;
            files::open_shared_folder(&app, folder)?;
            None
        }
        "fav" => {
            let entry = resolve_app(&launcher, &text("app"))?;
            let favorite = !entry.favorite;
            commands::apply_override(
                &app,
                &entry.id,
                &OverridePatch {
                    favorite: Some(favorite),
                    ..OverridePatch::default()
                },
            )?;
            Some(format!(
                "{} {} Favorites",
                entry.name,
                if favorite { "added to" } else { "removed from" }
            ))
        }
        "rescan" => {
            launcher.rescan();
            reload::emit(&app, events::CATALOG, ());
            Some("Apps rescanned".to_owned())
        }
        "theme" => {
            let value = match text("mode").as_str() {
                "dark" => "polar-night",
                "light" => "snow-storm",
                _ => "system",
            };
            commands::write_setting(&launcher, SettingKey::Theme, value)?;
            None
        }
        "size" => {
            commands::write_setting(&launcher, SettingKey::Size, &text("preset"))?;
            None
        }
        "pin" => {
            let pinned = !launcher.window().pinned;
            window::set_pinned(&app, pinned)?;
            Some(if pinned { "Pinned" } else { "Unpinned" }.to_owned())
        }
        "config" => {
            files::open_config(&app, ConfigFile::Settings)?;
            None
        }
        "keys" => {
            files::open_config(&app, ConfigFile::Keybindings)?;
            None
        }
        "logs" => {
            files::open_config(&app, ConfigFile::Logs)?;
            None
        }
        "hide" => {
            window::hide(&app)?;
            None
        }
        "quit" => {
            app.exit(0);
            None
        }
        other => {
            return Err(
                genslate_core_launcher::LauncherError::UnknownAction(other.to_owned()).into(),
            );
        }
    };
    Ok(ActionOutcome::Done { message })
}

/// An app by id (`genslate/explorer`) or by (case-insensitive) name / key; installed first.
fn resolve_app(launcher: &Launcher, query: &str) -> Result<AppEntry, AppError> {
    let catalog = launcher.catalog();
    if let Ok(id) = query.parse::<AppId>()
        && let Some(entry) = catalog.find(&id)
    {
        return Ok(entry.clone());
    }
    let wanted = query.trim().to_lowercase();
    let mut matches: Vec<&AppEntry> = catalog
        .apps()
        .iter()
        .filter(|app| app.name.to_lowercase() == wanted || app.id.key.to_lowercase() == wanted)
        .collect();
    matches.sort_by_key(|app| !matches!(app.status, AppStatus::Ready | AppStatus::Running));
    matches
        .first()
        .map(|app| (*app).clone())
        .ok_or_else(|| genslate_core_launcher::LauncherError::UnknownApp(query.to_owned()).into())
}
