//! Long-running work on background threads: copy/move, search and folder sizes. Each task has
//! an id chosen by the UI; progress and results arrive as events, and `cancel_task` stops it.

use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;
use std::thread;
use std::time::{Duration, Instant};

use genslate_core_explorer::entry::{Entry, require_absolute};
use genslate_core_explorer::preview::{self, FolderSize};
use genslate_core_explorer::search::{self, SearchQuery, SearchSummary};
use genslate_core_explorer::transfer::{
    self, ConflictPolicy, Progress, Transfer, TransferMode, TransferOutcome,
};
use genslate_core_explorer::undo::UndoAction;
use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::files::{emit, record};
use crate::error::ErrorPayload;
use crate::state::Explorer;
use crate::{AppError, events};

/// Progress events are sent at most this often.
const PROGRESS_INTERVAL: Duration = Duration::from_millis(100);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TaskProgress<'a> {
    id: &'a str,
    progress: &'a Progress,
}

/// How a transfer ended.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TaskDone {
    id: String,
    mode: TransferMode,
    /// Items copied or moved.
    done: usize,
    skipped: usize,
    cancelled: bool,
    /// Where the items ended up (to select them).
    targets: Vec<PathBuf>,
    error: Option<ErrorPayload>,
}

/// Names in `destination` that would collide with the sources (asked about before a paste).
#[tauri::command(async)]
pub fn find_conflicts(sources: Vec<String>, destination: String) -> Result<Vec<String>, AppError> {
    let sources = to_paths(&sources)?;
    Ok(transfer::find_conflicts(&sources, Path::new(&destination))?)
}

/// Starts copying or moving `sources` into `destination`.
#[tauri::command(async)]
pub fn start_transfer(
    app: AppHandle,
    id: String,
    mode: TransferMode,
    sources: Vec<String>,
    destination: String,
    policy: ConflictPolicy,
) -> Result<(), AppError> {
    let request = Transfer {
        mode,
        sources: to_paths(&sources)?,
        destination: require_absolute(Path::new(&destination))?,
        policy,
    };
    let explorer = app.state::<Explorer>();
    let cancel = explorer
        .start_task(&id)
        .ok_or_else(|| AppError::InvalidArgument(format!("task {id} is already running")))?;
    let handle = app.clone();
    spawn(&format!("transfer-{id}"), move || {
        let mut last = Instant::now()
            .checked_sub(PROGRESS_INTERVAL)
            .unwrap_or_else(Instant::now);
        let result = transfer::run(&request, &cancel, |progress| {
            if last.elapsed() >= PROGRESS_INTERVAL || progress.done_bytes == progress.total_bytes {
                last = Instant::now();
                emit(
                    &handle,
                    events::PROGRESS,
                    TaskProgress { id: &id, progress },
                );
            }
        });
        let explorer = handle.state::<Explorer>();
        explorer.finish_task(&id);
        let done = match result {
            Ok(outcome) => {
                if let Some(action) = undo_for(mode, &outcome) {
                    record(&handle, &explorer, action);
                }
                TaskDone {
                    id,
                    mode,
                    done: outcome.done.len(),
                    skipped: outcome.skipped.len(),
                    cancelled: outcome.cancelled,
                    targets: outcome.done.into_iter().map(|(_, target)| target).collect(),
                    error: None,
                }
            }
            Err(error) => TaskDone {
                id,
                mode,
                done: 0,
                skipped: 0,
                cancelled: false,
                targets: Vec::new(),
                error: Some(AppError::from(error).payload()),
            },
        };
        emit(&handle, events::TASK_DONE, done);
    })
}

/// How to reverse a finished transfer (nothing, when nothing was done).
fn undo_for(mode: TransferMode, outcome: &TransferOutcome) -> Option<UndoAction> {
    if outcome.done.is_empty() {
        return None;
    }
    Some(match mode {
        TransferMode::Copy => UndoAction::Create {
            paths: outcome
                .done
                .iter()
                .map(|(_, target)| target.clone())
                .collect(),
        },
        TransferMode::Move => UndoAction::Move {
            items: outcome.done.clone(),
        },
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchBatch<'a> {
    id: &'a str,
    entries: Vec<Entry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchDone {
    id: String,
    summary: Option<SearchSummary>,
    error: Option<ErrorPayload>,
}

/// Starts a recursive search; matches stream in as `explorer://search-results`.
#[tauri::command(async)]
pub fn start_search(app: AppHandle, id: String, query: SearchQuery) -> Result<(), AppError> {
    let explorer = app.state::<Explorer>();
    let cancel = explorer
        .start_task(&id)
        .ok_or_else(|| AppError::InvalidArgument(format!("task {id} is already running")))?;
    let handle = app.clone();
    spawn(&format!("search-{id}"), move || {
        let explorer = handle.state::<Explorer>();
        let result = search::search(&query, &cancel, |entries| {
            // Matches are on screen now: their folders may be previewed.
            for entry in &entries {
                if let Some(folder) = Path::new(&entry.path).parent() {
                    explorer.mark_browsed(folder);
                }
            }
            emit(
                &handle,
                events::SEARCH_RESULTS,
                SearchBatch { id: &id, entries },
            );
        });
        explorer.finish_task(&id);
        let done = match result {
            Ok(summary) => SearchDone {
                id,
                summary: Some(summary),
                error: None,
            },
            Err(error) => SearchDone {
                id,
                summary: None,
                error: Some(AppError::from(error).payload()),
            },
        };
        emit(&handle, events::SEARCH_DONE, done);
    })
}

/// Counts a folder's total size (cancel with the same id).
#[tauri::command(async)]
pub fn folder_size(app: AppHandle, id: String, path: String) -> Result<FolderSize, AppError> {
    let explorer = app.state::<Explorer>();
    let cancel = explorer
        .start_task(&id)
        .ok_or_else(|| AppError::InvalidArgument(format!("task {id} is already running")))?;
    let result = preview::folder_size(Path::new(&path), &cancel);
    explorer.finish_task(&id);
    Ok(result?)
}

/// Asks a running task to stop (it reports how far it got).
#[tauri::command]
pub fn cancel_task(app: AppHandle, id: String) {
    if let Some(flag) = app.state::<Explorer>().task(&id) {
        flag.store(true, Ordering::Relaxed);
    }
}

fn to_paths(paths: &[String]) -> Result<Vec<PathBuf>, AppError> {
    if paths.is_empty() {
        return Err(AppError::InvalidArgument("nothing was selected".to_owned()));
    }
    Ok(paths
        .iter()
        .map(|path| require_absolute(Path::new(path)))
        .collect::<Result<_, _>>()?)
}

fn spawn(name: &str, work: impl FnOnce() + Send + 'static) -> Result<(), AppError> {
    thread::Builder::new()
        .name(name.to_owned())
        .spawn(work)
        .map(|_| ())
        .map_err(|error| AppError::InvalidArgument(format!("could not start {name}: {error}")))
}
