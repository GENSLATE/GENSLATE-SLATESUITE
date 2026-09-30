//! File operations on library items: rename, move, copy, Trash (with Undo), open, reveal and
//! saving an edited copy. Items are named by id; paths come from the library.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use genslate_core_gallery::GalleryError;
use genslate_core_gallery::edit::{self, Recipe};
use genslate_core_gallery::library::MediaItem;
use genslate_core_gallery::{names, scan, trash};
use serde::Serialize;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use super::{absolute, changed, emit, pick_folder, record, require_ids};
use crate::state::{Gallery, UndoAction};
use crate::{AppError, events};

/// Renames one item's file (in place); returns the updated item.
#[tauri::command(async)]
pub fn rename_media(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    id: i64,
    new_name: String,
) -> Result<MediaItem, AppError> {
    let (path, _, _) = gallery.library.file_of(id)?;
    let from = PathBuf::from(&path);
    let name = names::validate(&new_name)?;
    let folder = from
        .parent()
        .ok_or_else(|| GalleryError::NotFound(from.clone()))?;
    let to = folder.join(name);
    if to == from {
        return Ok(gallery.library.item(id)?);
    }
    // A case-only rename is the same file on Windows and macOS.
    let same_file = to.to_string_lossy().to_lowercase() == from.to_string_lossy().to_lowercase();
    if names::exists(&to) && !same_file {
        return Err(GalleryError::AlreadyExists(name.to_owned()).into());
    }
    fs::rename(&from, &to).map_err(GalleryError::io("could not rename", &from))?;
    gallery.library.relocate(id, &scan::path_text(&to)?)?;
    record(
        &app,
        &gallery,
        UndoAction::Relocate {
            items: vec![(id, from, to)],
        },
    );
    changed(&app);
    Ok(gallery.library.item(id)?)
}

/// What a move or copy did.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferOutcome {
    /// The folder chosen (`None` when the user cancelled the dialog).
    pub destination: Option<String>,
    pub done: usize,
    /// Files that could not be moved or copied, with why.
    pub failed: Vec<(String, String)>,
}

impl TransferOutcome {
    fn cancelled() -> Self {
        Self {
            destination: None,
            done: 0,
            failed: Vec::new(),
        }
    }
}

/// Moves items into a folder (asked for when `destination` is `None`). Name clashes get a
/// number ("beach 2.jpg").
#[tauri::command(async)]
pub fn move_media(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    ids: Vec<i64>,
    destination: Option<String>,
) -> Result<TransferOutcome, AppError> {
    require_ids(&ids)?;
    let Some(folder) = destination_folder(&app, "Move to folder", destination)? else {
        return Ok(TransferOutcome::cancelled());
    };
    let mut moved = Vec::new();
    let mut failed = Vec::new();
    for (id, path) in gallery.library.paths_of(&ids)? {
        let from = PathBuf::from(&path);
        if from.parent() == Some(folder.as_path()) {
            continue;
        }
        let (stem, extension) = names::split(&from);
        let to = names::free_path(&folder, &stem, &extension);
        let result = move_file(&from, &to)
            .map_err(GalleryError::io("could not move", &from))
            .and_then(|()| gallery.library.relocate(id, &scan::path_text(&to)?));
        match result {
            Ok(()) => moved.push((id, from, to)),
            Err(error) => failed.push((path, error.to_string())),
        }
    }
    let done = moved.len();
    if !moved.is_empty() {
        record(&app, &gallery, UndoAction::Relocate { items: moved });
        changed(&app);
    }
    Ok(TransferOutcome {
        destination: Some(scan::path_text(&folder)?),
        done,
        failed,
    })
}

/// Copies items into a folder (asked for when `destination` is `None`). Copies inside a
/// library folder join the library.
#[tauri::command(async)]
pub fn copy_media(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    ids: Vec<i64>,
    destination: Option<String>,
) -> Result<TransferOutcome, AppError> {
    require_ids(&ids)?;
    let Some(folder) = destination_folder(&app, "Copy to folder", destination)? else {
        return Ok(TransferOutcome::cancelled());
    };
    let folder_text = scan::path_text(&folder)?;
    let in_library = gallery.library.root_of(&folder_text)?.is_some();
    let mut done = 0;
    let mut failed = Vec::new();
    for (_, path) in gallery.library.paths_of(&ids)? {
        let from = PathBuf::from(&path);
        let (stem, extension) = names::split(&from);
        let to = names::free_path(&folder, &stem, &extension);
        let result = fs::copy(&from, &to)
            .map_err(GalleryError::io("could not copy", &from))
            .and_then(|_| {
                if in_library {
                    scan::add_file(&gallery.library, &to).map(|_| ())
                } else {
                    Ok(())
                }
            });
        match result {
            Ok(()) => done += 1,
            Err(error) => failed.push((path, error.to_string())),
        }
    }
    if done > 0 && in_library {
        changed(&app);
    }
    Ok(TransferOutcome {
        destination: Some(folder_text),
        done,
        failed,
    })
}

/// Moves items' files to the OS trash; they stay listed in Gallery's Trash until restored or
/// removed from the list.
#[tauri::command(async)]
pub fn trash_media(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    ids: Vec<i64>,
) -> Result<usize, AppError> {
    require_ids(&ids)?;
    let items: Vec<(i64, PathBuf)> = gallery
        .library
        .paths_of(&ids)?
        .into_iter()
        .map(|(id, path)| (id, PathBuf::from(path)))
        .collect();
    let paths: Vec<PathBuf> = items.iter().map(|(_, path)| path.clone()).collect();
    trash::move_to_trash(&paths)?;
    let trashed: Vec<i64> = items.iter().map(|(id, _)| *id).collect();
    gallery.library.mark_trashed(&trashed)?;
    record(&app, &gallery, UndoAction::Trash { items });
    changed(&app);
    Ok(trashed.len())
}

/// Puts trashed items back where they were. Returns how many came back.
#[tauri::command(async)]
pub fn restore_media(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    ids: Vec<i64>,
) -> Result<usize, AppError> {
    require_ids(&ids)?;
    let items: Vec<(i64, PathBuf)> = gallery
        .library
        .paths_of(&ids)?
        .into_iter()
        .map(|(id, path)| (id, PathBuf::from(path)))
        .collect();
    let restored = restore(&gallery, &items)?;
    changed(&app);
    Ok(restored)
}

/// Removes items from Gallery's lists (Trash → "Remove from list"); the files are untouched.
#[tauri::command(async)]
pub fn forget_media(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    ids: Vec<i64>,
) -> Result<(), AppError> {
    require_ids(&ids)?;
    gallery.library.forget(&ids)?;
    changed(&app);
    Ok(())
}

/// Reverses the last rename, move or Trash. Returns what the next Undo would reverse.
#[tauri::command(async)]
pub fn undo(app: AppHandle, gallery: State<'_, Gallery>) -> Result<Option<&'static str>, AppError> {
    let Some(action) = gallery.pop_undo() else {
        return Ok(None);
    };
    let result = match action {
        UndoAction::Relocate { items } => {
            // Newest first, so chains of renames unwind in order.
            items.iter().rev().try_for_each(|(id, from, to)| {
                if names::exists(from) {
                    return Err(GalleryError::AlreadyExists(from.display().to_string()));
                }
                move_file(to, from).map_err(GalleryError::io("could not move back", to))?;
                gallery.library.relocate(*id, &scan::path_text(from)?)
            })
        }
        UndoAction::Trash { items } => restore(&gallery, &items).map(|_| ()),
    };
    let next = gallery.undo_label();
    emit(&app, events::UNDO, next);
    changed(&app);
    result?;
    Ok(next)
}

/// Opens an item in the OS default app.
#[tauri::command(async)]
pub fn open_media(app: AppHandle, gallery: State<'_, Gallery>, id: i64) -> Result<(), AppError> {
    let (path, _, _) = gallery.library.file_of(id)?;
    app.opener().open_path(path, None::<&str>)?;
    Ok(())
}

/// Shows an item in the OS file manager.
#[tauri::command(async)]
pub fn reveal_media(app: AppHandle, gallery: State<'_, Gallery>, id: i64) -> Result<(), AppError> {
    let (path, _, _) = gallery.library.file_of(id)?;
    app.opener().reveal_item_in_dir(path)?;
    Ok(())
}

/// Saves an edited copy next to the original ("beach (edited).jpg") and adds it to the
/// library. The original is never changed.
#[tauri::command(async)]
pub fn save_edit(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    id: i64,
    recipe: Recipe,
) -> Result<MediaItem, AppError> {
    recipe.validate()?;
    let (path, _, _) = gallery.library.file_of(id)?;
    let target = edit::save_copy(Path::new(&path), &recipe)?;
    let new_id = scan::add_file(&gallery.library, &target)?;
    gallery.library.mark_edited(new_id)?;
    changed(&app);
    Ok(gallery.library.item(new_id)?)
}

/// Puts `items` back from the OS trash and lists the ones that came back again.
fn restore(gallery: &Gallery, items: &[(i64, PathBuf)]) -> Result<usize, GalleryError> {
    let originals: Vec<PathBuf> = items.iter().map(|(_, path)| path.clone()).collect();
    trash::restore(&originals)?;
    let back: Vec<i64> = items
        .iter()
        .filter(|(_, path)| names::exists(path))
        .map(|(id, _)| *id)
        .collect();
    gallery.library.unmark_trashed(&back)?;
    Ok(back.len())
}

/// The folder a move or copy goes to: `destination`, else the user's pick (`None` = cancel).
fn destination_folder(
    app: &AppHandle,
    title: &str,
    destination: Option<String>,
) -> Result<Option<PathBuf>, AppError> {
    let folder = match destination {
        Some(folder) => absolute(&folder)?,
        None => match pick_folder(app, title, dirs::picture_dir().as_deref()) {
            Some(folder) => folder,
            None => return Ok(None),
        },
    };
    if !folder.is_dir() {
        return Err(GalleryError::NotAFolder(folder).into());
    }
    Ok(Some(folder))
}

/// Renames, or copies then deletes when `to` is on another drive.
fn move_file(from: &Path, to: &Path) -> io::Result<()> {
    match fs::rename(from, to) {
        Err(error) if error.kind() == io::ErrorKind::CrossesDevices => {
            fs::copy(from, to)?;
            fs::remove_file(from)
        }
        other => other,
    }
}
