//! Browsing and single-step file commands. Thin: parse, delegate to `genslate-core-explorer`,
//! record Undo, emit events. File system work runs off the main thread (`async` commands).
//!
//! The explorer is a file manager, so its commands reach any path the user can (like the
//! OS file manager); every path is checked to be absolute and cleaned of `.`/`..` first.

use std::path::{Path, PathBuf};

use genslate_core_explorer::config::{self, Explorer as ExplorerSettings, SettingValue};
use genslate_core_explorer::entry::{self, Entry, Listing, require_absolute};
use genslate_core_explorer::ops;
use genslate_core_explorer::places::{self, Place, Volume};
use genslate_core_explorer::preview::{self, Properties, TextPreview};
use genslate_core_explorer::undo::{self, UndoAction};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_opener::OpenerExt;

use crate::state::Explorer;
use crate::{AppError, events};

/// The longest text preview, in bytes.
const TEXT_PREVIEW_LIMIT: usize = 256 * 1024;

/// Items moved to the Trash can be put back (not on macOS, which has no API for it).
const CAN_RESTORE_FROM_TRASH: bool = cfg!(any(windows, all(unix, not(target_os = "macos"))));

/// Everything the UI needs at start.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerContext {
    pub home: Option<String>,
    /// Where the first tab opens (from `start-folder`).
    pub start_folder: String,
    pub places: Vec<Place>,
    pub volumes: Vec<Volume>,
    pub settings: ExplorerSettings,
    /// Undo can take items back out of the trash (Windows and Linux).
    pub can_restore_from_trash: bool,
    /// The OS "Open with" chooser is available (Windows).
    pub can_open_with: bool,
    pub undo: Option<&'static str>,
}

#[tauri::command(async)]
pub fn get_context(explorer: State<'_, Explorer>) -> ExplorerContext {
    let settings = explorer.config().explorer.clone();
    let places = places::standard_places();
    let home = dirs::home_dir().and_then(|home| entry::path_string(&home).ok());
    ExplorerContext {
        start_folder: start_folder(&settings.start_folder, &places, home.as_deref()),
        home,
        places,
        volumes: places::volumes(),
        settings,
        can_restore_from_trash: CAN_RESTORE_FROM_TRASH,
        can_open_with: cfg!(windows),
        undo: explorer.undo_label(),
    }
}

/// A place id, else an existing absolute folder, else Home, else the file system root.
fn start_folder(setting: &str, places: &[Place], home: Option<&str>) -> String {
    if let Some(place) = places.iter().find(|place| place.id == setting) {
        return place.path.clone();
    }
    let path = Path::new(setting);
    if path.is_absolute() && path.is_dir() {
        return setting.to_owned();
    }
    home.map_or_else(
        || if cfg!(windows) { "C:\\" } else { "/" }.to_owned(),
        str::to_owned,
    )
}

#[tauri::command(async)]
pub fn get_volumes() -> Vec<Volume> {
    places::volumes()
}

#[tauri::command(async)]
pub fn list_dir(
    explorer: State<'_, Explorer>,
    path: String,
    show_hidden: bool,
) -> Result<Listing, AppError> {
    let listing = entry::list_dir(Path::new(&path), show_hidden)?;
    explorer.mark_browsed(Path::new(&listing.path));
    Ok(listing)
}

#[tauri::command(async)]
pub fn create_folder(
    app: AppHandle,
    explorer: State<'_, Explorer>,
    parent: String,
    name: String,
) -> Result<Entry, AppError> {
    let path = ops::create_folder(Path::new(&parent), &name, true)?;
    record(
        &app,
        &explorer,
        UndoAction::Create {
            paths: vec![path.clone()],
        },
    );
    Ok(Entry::read(&path)?)
}

#[tauri::command(async)]
pub fn create_file(
    app: AppHandle,
    explorer: State<'_, Explorer>,
    parent: String,
    name: String,
) -> Result<Entry, AppError> {
    let path = ops::create_file(Path::new(&parent), &name, true)?;
    record(
        &app,
        &explorer,
        UndoAction::Create {
            paths: vec![path.clone()],
        },
    );
    Ok(Entry::read(&path)?)
}

#[tauri::command(async)]
pub fn rename(
    app: AppHandle,
    explorer: State<'_, Explorer>,
    path: String,
    new_name: String,
) -> Result<Entry, AppError> {
    let from = require_absolute(Path::new(&path))?;
    let to = ops::rename(&from, &new_name)?;
    if to != from {
        record(
            &app,
            &explorer,
            UndoAction::Rename {
                from,
                to: to.clone(),
            },
        );
    }
    Ok(Entry::read(&to)?)
}

#[tauri::command(async)]
pub fn trash(
    app: AppHandle,
    explorer: State<'_, Explorer>,
    paths: Vec<String>,
) -> Result<(), AppError> {
    let paths = absolute_all(&paths)?;
    ops::trash(&paths)?;
    // Without a way to restore (macOS), Undo would only fail: leave the stack as it is.
    if CAN_RESTORE_FROM_TRASH {
        record(&app, &explorer, UndoAction::Trash { paths });
    }
    Ok(())
}

#[tauri::command(async)]
pub fn delete_permanently(paths: Vec<String>) -> Result<(), AppError> {
    ops::delete_permanently(&absolute_all(&paths)?)?;
    Ok(())
}

/// Reverses the newest recorded operation; returns what was undone.
#[tauri::command(async)]
pub fn undo(
    app: AppHandle,
    explorer: State<'_, Explorer>,
) -> Result<Option<&'static str>, AppError> {
    let Some(action) = explorer.pop_undo() else {
        return Ok(None);
    };
    let result = undo::revert(&action);
    // A failed undo is dropped: what it would reverse has changed since.
    emit(&app, events::UNDO, explorer.undo_label());
    result?;
    Ok(Some(action.label()))
}

#[tauri::command(async)]
pub fn read_text(path: String) -> Result<TextPreview, AppError> {
    Ok(preview::read_text(Path::new(&path), TEXT_PREVIEW_LIMIT)?)
}

#[tauri::command(async)]
pub fn get_properties(path: String) -> Result<Properties, AppError> {
    Ok(preview::properties(Path::new(&path))?)
}

/// Opens with the default app (runs programs, like double-clicking them in the OS).
#[tauri::command(async)]
pub fn open_path(app: AppHandle, path: String) -> Result<(), AppError> {
    let path = existing(&path)?;
    app.opener()
        .open_path(entry::path_string(&path)?, None::<&str>)?;
    Ok(())
}

/// Shows the OS "Open with" chooser (Windows).
#[tauri::command(async)]
pub fn open_with(path: String) -> Result<(), AppError> {
    let path = existing(&path)?;
    #[cfg(windows)]
    {
        std::process::Command::new("rundll32.exe")
            .arg("shell32.dll,OpenAs_RunDLL")
            .arg(&path)
            .spawn()
            .map_err(|error| {
                AppError::InvalidArgument(format!("could not show Open with: {error}"))
            })?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        Err(AppError::Unsupported(
            "“Open with” is only available on Windows for now.",
        ))
    }
}

/// Shows the item in the OS file manager.
#[tauri::command(async)]
pub fn reveal_path(app: AppHandle, path: String) -> Result<(), AppError> {
    app.opener().reveal_item_in_dir(existing(&path)?)?;
    Ok(())
}

/// Watches exactly these folders for live refresh.
#[tauri::command(async)]
pub fn watch_folders(explorer: State<'_, Explorer>, paths: Vec<String>) -> Result<(), AppError> {
    let folders = absolute_all(&paths)?;
    if let Some(watcher) = explorer.watcher().as_mut() {
        watcher.set_folders(folders);
    }
    Ok(())
}

/// Writes one `[explorer]` key to `config.toml` and returns the new settings.
#[tauri::command(async)]
pub fn set_setting(
    explorer: State<'_, Explorer>,
    key: String,
    value: SettingValue,
) -> Result<ExplorerSettings, AppError> {
    let updated = config::write_setting(&explorer.paths.config_file, &key, &value)?;
    let settings = updated.explorer.clone();
    explorer.set_config(updated);
    Ok(settings)
}

/// Records `action` for Undo and tells the UI.
pub fn record(app: &AppHandle, explorer: &Explorer, action: UndoAction) {
    let label = explorer.push_undo(action);
    emit(app, events::UNDO, Some(label));
}

/// Emits an event; a failure only means no window is listening.
pub fn emit<T: Serialize + Clone>(app: &AppHandle, event: &str, payload: T) {
    if let Err(error) = app.emit(event, payload) {
        log::debug!("emit {event}: {error}");
    }
}

fn absolute_all(paths: &[String]) -> Result<Vec<PathBuf>, AppError> {
    if paths.is_empty() {
        return Err(AppError::InvalidArgument("nothing was selected".to_owned()));
    }
    Ok(paths
        .iter()
        .map(|path| require_absolute(Path::new(path)))
        .collect::<Result<_, _>>()?)
}

fn existing(path: &str) -> Result<PathBuf, AppError> {
    let path = require_absolute(Path::new(path))?;
    if path.symlink_metadata().is_err() {
        return Err(genslate_core_explorer::ExplorerError::NotFound(path).into());
    }
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn start_folder_prefers_places_then_paths_then_home() {
        let places = vec![Place {
            id: "documents",
            label: "Documents",
            path: "/home/me/Documents".to_owned(),
        }];
        assert_eq!(
            start_folder("documents", &places, Some("/home/me")),
            "/home/me/Documents"
        );
        assert_eq!(
            start_folder("nowhere", &places, Some("/home/me")),
            "/home/me"
        );
        let temp = std::env::temp_dir();
        let temp = temp.to_string_lossy();
        assert_eq!(start_folder(&temp, &places, Some("/home/me")), temp);
    }
}
