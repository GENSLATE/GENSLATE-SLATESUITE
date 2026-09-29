//! Command history search and cleanup. Without a history database (it could not open) the
//! history is simply empty.

use genslate_core_terminal::history::HistoryEntry;
use tauri::State;

use crate::AppError;
use crate::state::Terminal;

/// The most entries one search returns.
const MAX_RESULTS: u32 = 1_000;

#[tauri::command(async)]
pub fn history_search(
    terminal: State<'_, Terminal>,
    query: String,
    cwd: Option<String>,
    failed_only: bool,
    limit: u32,
) -> Result<Vec<HistoryEntry>, AppError> {
    let Some(history) = &terminal.history else {
        return Ok(Vec::new());
    };
    let limit = usize::try_from(limit.clamp(1, MAX_RESULTS)).unwrap_or(1);
    Ok(history.search(&query, cwd.as_deref(), failed_only, limit)?)
}

#[tauri::command(async)]
pub fn history_delete(terminal: State<'_, Terminal>, id: i64) -> Result<(), AppError> {
    if let Some(history) = &terminal.history {
        history.delete(id)?;
    }
    Ok(())
}

#[tauri::command(async)]
pub fn history_clear(terminal: State<'_, Terminal>) -> Result<(), AppError> {
    if let Some(history) = &terminal.history {
        history.clear()?;
    }
    Ok(())
}
