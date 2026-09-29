//! The Files side panel (listing, git state, live refresh), opening and revealing paths, and
//! saving a tab's output to a file.

use std::path::{Path, PathBuf};

use genslate_core_terminal::TerminalError;
use genslate_core_terminal::files::{self, DirListing};
use genslate_core_terminal::git::{self, GitInfo};
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use crate::AppError;
use crate::state::Terminal;

/// The most folders watched at once (expanded folders in the Files panel).
const MAX_WATCHED: usize = 512;

/// The entries of an absolute folder, folders first, with their git status.
#[tauri::command(async)]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri commands receive owned arguments"
)]
pub fn list_dir(path: String, show_hidden: bool) -> Result<DirListing, AppError> {
    Ok(files::list_dir(Path::new(&path), show_hidden)?)
}

/// The repository containing an absolute folder, or `None` outside one.
#[tauri::command(async)]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri commands receive owned arguments"
)]
pub fn git_info(path: String) -> Result<Option<GitInfo>, AppError> {
    let folder = files::existing_folder(Path::new(&path))?;
    Ok(git::info(&folder)?)
}

/// Watches exactly these absolute folders (not their subfolders); changes arrive as
/// `terminal://files-changed` with the same strings.
#[tauri::command(async)]
pub fn watch_dirs(terminal: State<'_, Terminal>, paths: Vec<String>) -> Result<(), AppError> {
    if paths.len() > MAX_WATCHED {
        return Err(AppError::InvalidArgument(format!(
            "at most {MAX_WATCHED} folders can be watched"
        )));
    }
    let folders = paths
        .into_iter()
        .map(|path| {
            let path = PathBuf::from(path);
            if path.is_absolute() {
                Ok(path)
            } else {
                Err(TerminalError::NotAbsolute(path))
            }
        })
        .collect::<Result<Vec<_>, _>>()?;
    if let Some(watcher) = terminal.watcher().as_mut() {
        watcher.set_folders(folders);
    }
    Ok(())
}

/// Opens an existing file or folder with its default app.
#[tauri::command(async)]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri commands receive owned arguments"
)]
pub fn open_path(app: AppHandle, path: String) -> Result<(), AppError> {
    let path = files::existing_path(Path::new(&path))?;
    let text = path
        .to_str()
        .ok_or_else(|| AppError::InvalidArgument("the path is not valid Unicode".to_owned()))?;
    app.opener().open_path(text, None::<&str>)?;
    Ok(())
}

/// Shows an existing file or folder in the OS file manager.
#[tauri::command(async)]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri commands receive owned arguments"
)]
pub fn reveal_path(app: AppHandle, path: String) -> Result<(), AppError> {
    app.opener()
        .reveal_item_in_dir(files::existing_path(Path::new(&path))?)?;
    Ok(())
}

/// Saves text (a tab's output) to a new file in Downloads (else home) and returns its path.
#[tauri::command(async)]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri commands receive owned arguments"
)]
pub fn save_output(file_name: String, text: String) -> Result<String, AppError> {
    let folder = dirs::download_dir()
        .filter(|folder| folder.is_dir())
        .or_else(dirs::home_dir)
        .ok_or_else(|| {
            AppError::InvalidArgument("there is no Downloads or home folder".to_owned())
        })?;
    let written = files::save_output(&folder, &file_name, &text)?;
    log::info!("saved terminal output to {}", written.display());
    Ok(written.to_string_lossy().into_owned())
}
