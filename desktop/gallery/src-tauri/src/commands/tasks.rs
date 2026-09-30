//! Long-running work on background threads: the duplicate finder and exports. Each task has
//! an id chosen by the UI; progress and results arrive as events, and `cancel_task` stops it.

use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::time::{Duration, Instant};

use genslate_core_gallery::duplicates::{self, DuplicateGroup};
use genslate_core_gallery::export::{self, ExportOptions};
use genslate_core_gallery::scan;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use super::{absolute, emit, pick_folder, require_ids, spawn};
use crate::error::ErrorPayload;
use crate::state::Gallery;
use crate::{AppError, events};

/// Progress events are sent at most this often.
const PROGRESS_INTERVAL: Duration = Duration::from_millis(100);

/// `done` of `total` steps of task `id`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TaskProgress<'a> {
    id: &'a str,
    done: usize,
    total: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DuplicatesDone {
    id: String,
    /// `None` when cancelled.
    groups: Option<Vec<DuplicateGroup>>,
    error: Option<ErrorPayload>,
}

/// Starts looking for copies across the library (hashing what is new first).
#[tauri::command(async)]
pub fn find_duplicates(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    id: String,
) -> Result<(), AppError> {
    let cancel = gallery
        .start_task(&id)
        .ok_or_else(|| AppError::InvalidArgument(format!("task {id} is already running")))?;
    let handle = app.clone();
    spawn(&format!("duplicates-{id}"), move || {
        let gallery = handle.state::<Gallery>();
        let mut last = Instant::now();
        let result = duplicates::find(&gallery.library, &gallery.thumbnails, &cancel, |progress| {
            if last.elapsed() >= PROGRESS_INTERVAL || progress.hashed == progress.to_hash {
                last = Instant::now();
                emit(
                    &handle,
                    events::TASK_PROGRESS,
                    TaskProgress {
                        id: &id,
                        done: progress.hashed,
                        total: progress.to_hash,
                    },
                );
            }
        });
        gallery.finish_task(&id);
        let done = match result {
            Ok(groups) => DuplicatesDone {
                id,
                groups,
                error: None,
            },
            Err(error) => DuplicatesDone {
                id,
                groups: None,
                error: Some(AppError::from(error).payload()),
            },
        };
        emit(&handle, events::DUPLICATES_DONE, done);
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportDone {
    id: String,
    destination: String,
    written: usize,
    /// Files that could not be exported, with why.
    failed: Vec<(String, String)>,
    cancelled: bool,
    error: Option<ErrorPayload>,
}

/// Starts exporting items into a folder (asked for when `destination` is `None`). Returns
/// the folder, or `None` when the user cancelled the dialog.
#[tauri::command(async)]
pub fn export_media(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    id: String,
    ids: Vec<i64>,
    options: ExportOptions,
    destination: Option<String>,
) -> Result<Option<String>, AppError> {
    require_ids(&ids)?;
    let folder = match destination {
        Some(folder) => absolute(&folder)?,
        None => match pick_folder(&app, "Export to folder", dirs::picture_dir().as_deref()) {
            Some(folder) => folder,
            None => return Ok(None),
        },
    };
    let destination = scan::path_text(&folder)?;
    let sources: Vec<PathBuf> = gallery
        .library
        .paths_of(&ids)?
        .into_iter()
        .map(|(_, path)| PathBuf::from(path))
        .collect();
    let cancel = gallery
        .start_task(&id)
        .ok_or_else(|| AppError::InvalidArgument(format!("task {id} is already running")))?;
    let handle = app.clone();
    let reply = destination.clone();
    spawn(&format!("export-{id}"), move || {
        let mut last = Instant::now();
        let result = export::export(&sources, &folder, options, &cancel, |done, total| {
            if last.elapsed() >= PROGRESS_INTERVAL || done == total {
                last = Instant::now();
                emit(
                    &handle,
                    events::TASK_PROGRESS,
                    TaskProgress {
                        id: &id,
                        done,
                        total,
                    },
                );
            }
        });
        handle.state::<Gallery>().finish_task(&id);
        let done = match result {
            Ok(outcome) => ExportDone {
                id,
                destination,
                written: outcome.written.len(),
                failed: outcome
                    .failed
                    .into_iter()
                    .map(|(path, why)| (path.to_string_lossy().into_owned(), why))
                    .collect(),
                cancelled: outcome.cancelled,
                error: None,
            },
            Err(error) => ExportDone {
                id,
                destination,
                written: 0,
                failed: Vec::new(),
                cancelled: false,
                error: Some(AppError::from(error).payload()),
            },
        };
        emit(&handle, events::EXPORT_DONE, done);
    })?;
    Ok(Some(reply))
}

/// Asks a running task to stop (it reports `cancelled` when it does).
#[tauri::command]
pub fn cancel_task(gallery: State<'_, Gallery>, id: String) {
    if let Some(cancel) = gallery.task(&id) {
        cancel.store(true, Ordering::Relaxed);
    }
}
