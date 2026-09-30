//! The library: folders, scans, lists, details, favorites, ratings, tags, albums and settings.
//! Thin: parse, delegate to `genslate-core-gallery`, emit `gallery://library-changed`.

use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use genslate_core_gallery::GallerySettings;
use genslate_core_gallery::config::{self, SettingValue};
use genslate_core_gallery::kind::Format;
use genslate_core_gallery::library::{Album, MediaDetails, MediaItem, Query, Summary};
use genslate_core_gallery::scan::{self, ScanOptions, ScanOutcome};
use genslate_core_gallery::trash::CAN_RESTORE;
use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime, State};

use super::{absolute, changed, emit, pick_folder, require_ids, spawn};
use crate::error::ErrorPayload;
use crate::state::Gallery;
use crate::{AppError, events};

/// The UI hears about scan progress at most this often; the grid refills at this pace too.
const PROGRESS_INTERVAL: Duration = Duration::from_millis(400);

/// Everything the UI needs at start.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GalleryContext {
    pub settings: GallerySettings,
    /// Items trashed from Gallery can be put back (Windows and Linux).
    pub can_restore: bool,
    pub undo: Option<&'static str>,
    /// The Pictures folder, offered on the empty library screen (only while the library has
    /// no folders and `suggest-pictures` is on).
    pub suggested_folder: Option<String>,
    /// Files or folders the app was started with.
    pub launch: Vec<String>,
}

#[tauri::command(async)]
pub fn get_context(gallery: State<'_, Gallery>) -> Result<GalleryContext, AppError> {
    let settings = gallery.config().gallery.clone();
    let suggested_folder = if settings.suggest_pictures && gallery.library.roots()?.is_empty() {
        dirs::picture_dir()
            .filter(|folder| folder.is_dir())
            .and_then(|folder| folder.to_str().map(str::to_owned))
    } else {
        None
    };
    Ok(GalleryContext {
        settings,
        can_restore: CAN_RESTORE,
        undo: gallery.undo_label(),
        suggested_folder,
        launch: gallery
            .take_launch()
            .into_iter()
            .filter_map(|path| path.to_str().map(str::to_owned))
            .collect(),
    })
}

#[tauri::command(async)]
pub fn get_summary(gallery: State<'_, Gallery>) -> Result<Summary, AppError> {
    Ok(gallery.library.summary()?)
}

#[tauri::command(async)]
pub fn query_media(gallery: State<'_, Gallery>, query: Query) -> Result<Vec<MediaItem>, AppError> {
    Ok(gallery.library.query(&query)?)
}

#[tauri::command(async)]
pub fn get_details(gallery: State<'_, Gallery>, id: i64) -> Result<MediaDetails, AppError> {
    Ok(gallery.library.details(id)?)
}

/// Asks for a folder, then adds it. `None` when the user cancels.
#[tauri::command(async)]
pub fn add_folder(app: AppHandle) -> Result<Option<String>, AppError> {
    let Some(folder) = pick_folder(
        &app,
        "Add a folder to Gallery",
        dirs::picture_dir().as_deref(),
    ) else {
        return Ok(None);
    };
    add_root(&app, &folder).map(Some)
}

/// Adds a folder the UI already knows (the suggested Pictures folder, a dropped folder).
#[tauri::command(async)]
pub fn add_folder_path(app: AppHandle, path: String) -> Result<String, AppError> {
    add_root(&app, &absolute(&path)?)
}

/// Adds `folder` (unless a library folder already holds it) and scans it. Returns the folder
/// that holds it in the library.
pub fn add_root<R: Runtime>(app: &AppHandle<R>, folder: &Path) -> Result<String, AppError> {
    if !folder.is_dir() {
        return Err(genslate_core_gallery::GalleryError::NotAFolder(folder.to_path_buf()).into());
    }
    let text = scan::path_text(folder)?;
    let gallery = app.state::<Gallery>();
    if gallery.library.add_root(&text)? {
        refresh_watcher(&gallery);
        start_scan(app, vec![folder.to_path_buf()]);
        changed(app);
        return Ok(text);
    }
    Ok(gallery.library.root_of(&text)?.unwrap_or(text))
}

/// Removes a library folder: its items leave the library, the files stay on disk.
#[tauri::command(async)]
pub fn remove_folder(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    path: String,
) -> Result<u64, AppError> {
    if let Some(cancel) = gallery.task(&scan_task(&path)) {
        cancel.store(true, std::sync::atomic::Ordering::Relaxed);
    }
    // Let a running scan of it stop before its rows go.
    let removed = {
        let _scan = gallery.scan_lock();
        gallery.library.remove_root(&path)?
    };
    refresh_watcher(&gallery);
    changed(&app);
    Ok(removed)
}

/// Scans every library folder again.
#[tauri::command(async)]
pub fn rescan(app: AppHandle, gallery: State<'_, Gallery>) -> Result<(), AppError> {
    let roots = gallery.library.roots()?;
    start_scan(&app, roots.into_iter().map(PathBuf::from).collect());
    Ok(())
}

/// How a round of scans ended.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScanDone {
    added: usize,
    updated: usize,
    removed: usize,
    errors: Vec<ErrorPayload>,
}

fn scan_task(folder: &str) -> String {
    format!("scan:{folder}")
}

/// Scans `folders` one after another on a background thread (after any running scan),
/// refreshing the UI as items arrive.
pub fn start_scan<R: Runtime>(app: &AppHandle<R>, folders: Vec<PathBuf>) {
    if folders.is_empty() {
        return;
    }
    let handle = app.clone();
    let started = spawn("gallery-scan", move || {
        let gallery = handle.state::<Gallery>();
        let _scan = gallery.scan_lock();
        let options = ScanOptions {
            include_hidden: gallery.config().gallery.include_hidden,
        };
        let mut done = ScanDone {
            added: 0,
            updated: 0,
            removed: 0,
            errors: Vec::new(),
        };
        for folder in folders {
            let id = scan_task(&folder.to_string_lossy());
            let Some(cancel) = gallery.start_task(&id) else {
                continue;
            };
            let mut last = Instant::now();
            let mut refreshed = 0;
            let result =
                scan::sync_folder(&gallery.library, &folder, options, &cancel, |progress| {
                    if last.elapsed() >= PROGRESS_INTERVAL || progress.read == progress.to_read {
                        last = Instant::now();
                        emit(&handle, events::SCAN_PROGRESS, progress.clone());
                        if progress.read > refreshed {
                            refreshed = progress.read;
                            changed(&handle);
                        }
                    }
                });
            gallery.finish_task(&id);
            match result {
                Ok(ScanOutcome {
                    added,
                    updated,
                    removed,
                    ..
                }) => {
                    done.added += added;
                    done.updated += updated;
                    done.removed += removed;
                }
                Err(error) => {
                    log::warn!("scan {}: {error}", folder.display());
                    done.errors.push(AppError::from(error).payload());
                }
            }
        }
        changed(&handle);
        emit(&handle, events::SCAN_DONE, done);
    });
    if let Err(error) = started {
        log::warn!("{error}");
    }
}

/// Watches exactly the library folders.
pub fn refresh_watcher(gallery: &Gallery) {
    let roots: Vec<PathBuf> = match gallery.library.roots() {
        Ok(roots) => roots.into_iter().map(PathBuf::from).collect(),
        Err(error) => {
            log::warn!("library folders: {error}");
            return;
        }
    };
    if let Some(watcher) = gallery.watcher().as_mut() {
        watcher.set_folders(&roots);
    }
}

/// What opening paths from a launch or a drop found.
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Opened {
    /// Photos and videos to show (the first one opens in the viewer).
    pub ids: Vec<i64>,
    /// Folders added to (or already in) the library.
    pub folders: Vec<String>,
}

/// Opens files and folders: folders join the library; files are read (if new) and returned
/// so the viewer can show them.
#[tauri::command(async)]
pub fn open_paths(app: AppHandle, paths: Vec<String>) -> Result<Opened, AppError> {
    let gallery = app.state::<Gallery>();
    let mut opened = Opened::default();
    for path in paths {
        let path = absolute(&path)?;
        if path.is_dir() {
            opened.folders.push(add_root(&app, &path)?);
        } else if Format::of(&path).is_some() && path.is_file() {
            let known = gallery.library.id_of(&scan::path_text(&path)?)?;
            let id = match known {
                Some(id) => id,
                None => scan::add_file(&gallery.library, &path)?,
            };
            opened.ids.push(id);
        }
    }
    if !opened.ids.is_empty() {
        changed(&app);
    }
    Ok(opened)
}

#[tauri::command(async)]
pub fn set_favorite(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    ids: Vec<i64>,
    favorite: bool,
) -> Result<(), AppError> {
    require_ids(&ids)?;
    gallery.library.set_favorite(&ids, favorite)?;
    changed(&app);
    Ok(())
}

#[tauri::command(async)]
pub fn set_rating(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    ids: Vec<i64>,
    rating: u8,
) -> Result<(), AppError> {
    require_ids(&ids)?;
    gallery.library.set_rating(&ids, rating)?;
    changed(&app);
    Ok(())
}

/// Tags items; returns the tag as stored (an existing tag keeps its spelling).
#[tauri::command(async)]
pub fn add_tag(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    ids: Vec<i64>,
    name: String,
) -> Result<String, AppError> {
    require_ids(&ids)?;
    let tag = gallery.library.add_tag(&ids, &name)?;
    changed(&app);
    Ok(tag)
}

#[tauri::command(async)]
pub fn remove_tag(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    ids: Vec<i64>,
    name: String,
) -> Result<(), AppError> {
    require_ids(&ids)?;
    gallery.library.remove_tag(&ids, &name)?;
    changed(&app);
    Ok(())
}

#[tauri::command(async)]
pub fn create_album(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    name: String,
    ids: Vec<i64>,
) -> Result<Album, AppError> {
    let album = gallery.library.create_album(&name)?;
    if !ids.is_empty() {
        gallery.library.add_to_album(album.id, &ids)?;
    }
    changed(&app);
    Ok(album)
}

#[tauri::command(async)]
pub fn rename_album(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    id: i64,
    name: String,
) -> Result<(), AppError> {
    gallery.library.rename_album(id, &name)?;
    changed(&app);
    Ok(())
}

/// Deletes an album (its photos and videos stay in the library).
#[tauri::command(async)]
pub fn delete_album(app: AppHandle, gallery: State<'_, Gallery>, id: i64) -> Result<(), AppError> {
    gallery.library.delete_album(id)?;
    changed(&app);
    Ok(())
}

/// Adds items to an album; returns how many were new to it.
#[tauri::command(async)]
pub fn add_to_album(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    album: i64,
    ids: Vec<i64>,
) -> Result<u64, AppError> {
    require_ids(&ids)?;
    let added = gallery.library.add_to_album(album, &ids)?;
    changed(&app);
    Ok(added)
}

#[tauri::command(async)]
pub fn remove_from_album(
    app: AppHandle,
    gallery: State<'_, Gallery>,
    album: i64,
    ids: Vec<i64>,
) -> Result<(), AppError> {
    require_ids(&ids)?;
    gallery.library.remove_from_album(album, &ids)?;
    changed(&app);
    Ok(())
}

/// Writes one `[gallery]` key to `config.toml` and returns the new settings.
#[tauri::command(async)]
pub fn set_setting(
    gallery: State<'_, Gallery>,
    key: String,
    value: SettingValue,
) -> Result<GallerySettings, AppError> {
    let updated = config::write_setting(&gallery.paths.config_file, &key, &value)?;
    let settings = updated.gallery.clone();
    gallery.set_config(updated);
    Ok(settings)
}
