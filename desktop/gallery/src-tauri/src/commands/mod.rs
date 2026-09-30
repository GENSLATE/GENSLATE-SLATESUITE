//! `#[tauri::command]` handlers, registered in `lib.rs` by full module path
//! (`#[tauri::command]` companion items are not carried by `pub use`).
//!
//! Commands take library ids, not paths, wherever the item is already in the library, so the
//! webview can only reach files the user added.

pub mod app_info;
pub mod files;
pub mod library;
pub mod tasks;

use std::path::{Path, PathBuf};
use std::thread;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_dialog::DialogExt;

use crate::state::{Gallery, UndoAction};
use crate::{AppError, events};

/// Emits an event; a failure only means no window is listening.
pub fn emit<R: Runtime, T: Serialize + Clone>(app: &AppHandle<R>, event: &str, payload: T) {
    if let Err(error) = app.emit(event, payload) {
        log::debug!("emit {event}: {error}");
    }
}

/// Tells the UI the library changed.
pub fn changed<R: Runtime>(app: &AppHandle<R>) {
    emit(app, events::LIBRARY_CHANGED, ());
}

/// Records `action` for Undo and tells the UI.
pub fn record<R: Runtime>(app: &AppHandle<R>, gallery: &Gallery, action: UndoAction) {
    let label = gallery.push_undo(action);
    emit(app, events::UNDO, Some(label));
}

/// Runs `work` on a named background thread.
pub fn spawn(name: &str, work: impl FnOnce() + Send + 'static) -> Result<(), AppError> {
    thread::Builder::new()
        .name(name.to_owned())
        .spawn(work)
        .map(|_| ())
        .map_err(|error| AppError::InvalidArgument(format!("could not start {name}: {error}")))
}

/// Refuses an empty selection.
pub fn require_ids(ids: &[i64]) -> Result<(), AppError> {
    if ids.is_empty() {
        return Err(AppError::InvalidArgument("nothing was selected".to_owned()));
    }
    Ok(())
}

/// An absolute folder path from the UI.
pub fn absolute(path: &str) -> Result<PathBuf, AppError> {
    let path = Path::new(path);
    if !path.is_absolute() {
        return Err(genslate_core_gallery::GalleryError::NotAbsolute(path.to_path_buf()).into());
    }
    Ok(path.to_path_buf())
}

/// Asks for a folder with the OS dialog (blocking, so only from `async` commands).
/// `None` when the user cancels.
pub fn pick_folder<R: Runtime>(
    app: &AppHandle<R>,
    title: &str,
    start: Option<&Path>,
) -> Option<PathBuf> {
    let mut dialog = app.dialog().file().set_title(title);
    if let Some(start) = start.filter(|start| start.is_dir()) {
        dialog = dialog.set_directory(start);
    }
    dialog
        .blocking_pick_folder()
        .and_then(|picked| picked.as_path().map(Path::to_path_buf))
}
