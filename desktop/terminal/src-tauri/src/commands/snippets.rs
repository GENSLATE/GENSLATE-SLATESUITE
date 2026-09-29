//! Snippets in `snippets.toml` (next to `config.toml`).

use genslate_core_terminal::snippets::{self, Snippet, SnippetInput};
use tauri::State;

use crate::AppError;
use crate::state::Terminal;

#[tauri::command(async)]
pub fn list_snippets(terminal: State<'_, Terminal>) -> Result<Vec<Snippet>, AppError> {
    Ok(snippets::load(&terminal.snippets_file())?)
}

/// Adds (`id: null`) or replaces a snippet; returns them all.
#[tauri::command(async)]
pub fn save_snippet(
    terminal: State<'_, Terminal>,
    snippet: SnippetInput,
) -> Result<Vec<Snippet>, AppError> {
    let _guard = terminal.snippets_lock();
    Ok(snippets::save(&terminal.snippets_file(), snippet)?)
}

#[tauri::command(async)]
pub fn delete_snippet(terminal: State<'_, Terminal>, id: String) -> Result<Vec<Snippet>, AppError> {
    let _guard = terminal.snippets_lock();
    Ok(snippets::delete(&terminal.snippets_file(), &id)?)
}
