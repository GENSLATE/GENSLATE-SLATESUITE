//! Keeps the library in step with the disk: walks a folder (`ignore`, ripgrep's walker),
//! reads the metadata of new and changed files on every core (`rayon`), stores them in
//! batches and forgets files that are gone.

use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::UNIX_EPOCH;

use rayon::prelude::*;
use serde::Serialize;

use crate::GalleryError;
use crate::kind::{Format, looks_like_screenshot};
use crate::library::{Library, NewMedia, is_inside};
use crate::metadata::{self, Metadata};
use crate::places::{self, Place};

/// Files read and stored per batch (progress is reported after each).
const BATCH: usize = 64;

/// How far a scan has come.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    /// The folder being scanned.
    pub folder: String,
    /// Photos and videos found so far.
    pub found: usize,
    /// New or changed files to read.
    pub to_read: usize,
    /// Of those, read so far.
    pub read: usize,
}

/// What a scan changed.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanOutcome {
    pub found: usize,
    pub added: usize,
    pub updated: usize,
    pub removed: usize,
    pub cancelled: bool,
}

/// Options shared by every scan.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct ScanOptions {
    /// Include hidden files and folders (dot files, and hidden ones on Windows).
    pub include_hidden: bool,
}

/// A photo or video found on disk.
#[derive(Debug, Clone, PartialEq, Eq)]
struct Found {
    path: String,
    format: Format,
    size: u64,
    modified_ms: i64,
}

/// Brings everything under `folder` up to date.
pub fn sync_folder(
    library: &Library,
    folder: &Path,
    options: ScanOptions,
    cancel: &AtomicBool,
    mut progress: impl FnMut(&ScanProgress),
) -> Result<ScanOutcome, GalleryError> {
    if !folder.is_dir() {
        return Err(GalleryError::NotAFolder(folder.to_path_buf()));
    }
    let folder_text = path_text(folder)?;
    let mut report = ScanProgress {
        folder: folder_text.clone(),
        found: 0,
        to_read: 0,
        read: 0,
    };
    let mut found = Vec::new();
    for entry in walker(folder, options).build() {
        if cancel.load(Ordering::Relaxed) {
            return Ok(ScanOutcome {
                cancelled: true,
                ..ScanOutcome::default()
            });
        }
        let Ok(entry) = entry else { continue };
        if !entry.file_type().is_some_and(|kind| kind.is_file()) {
            continue;
        }
        if let Some(file) = found_file(entry.path()) {
            found.push(file);
            report.found = found.len();
            if found.len() % 500 == 0 {
                progress(&report);
            }
        }
    }

    let mut known = library.known_files(&folder_text)?;
    let mut outcome = ScanOutcome {
        found: found.len(),
        ..ScanOutcome::default()
    };
    let mut changed = Vec::new();
    for file in found {
        match known.remove(&file.path) {
            Some(old) if old.size == file.size && old.modified_ms == file.modified_ms => {
                // Unchanged, but a file listed in the Trash is back on disk: list it again.
                if old.trashed {
                    library.unmark_trashed(&[old.id])?;
                }
            }
            Some(_) => {
                outcome.updated += 1;
                changed.push(file);
            }
            None => {
                outcome.added += 1;
                changed.push(file);
            }
        }
    }
    let missing: Vec<String> = known
        .into_iter()
        .filter(|(_, file)| !file.trashed)
        .map(|(path, _)| path)
        .collect();
    outcome.removed = usize::try_from(library.remove_missing(&missing)?).unwrap_or(usize::MAX);

    report.to_read = changed.len();
    progress(&report);
    for batch in changed.chunks(BATCH) {
        if cancel.load(Ordering::Relaxed) {
            outcome.cancelled = true;
            break;
        }
        store(library, batch)?;
        report.read += batch.len();
        progress(&report);
    }
    Ok(outcome)
}

/// Updates the library for paths the watcher reported: new or changed files are read, gone
/// files and folders are forgotten, new folders are scanned. Paths outside the library
/// folders are ignored.
pub fn sync_paths(
    library: &Library,
    paths: &[std::path::PathBuf],
    options: ScanOptions,
) -> Result<bool, GalleryError> {
    let roots = library.roots()?;
    let never = AtomicBool::new(false);
    let mut changed = false;
    let mut files = Vec::new();
    let mut gone = Vec::new();
    for path in paths {
        let Ok(text) = path_text(path) else { continue };
        if !roots.iter().any(|root| is_inside(&text, root)) {
            continue;
        }
        if path.is_dir() {
            let outcome = sync_folder(library, path, options, &never, |_| {})?;
            changed |= outcome.added + outcome.updated + outcome.removed > 0;
        } else if let Some(file) = found_file(path) {
            let unchanged = library
                .known_files(&parent_text(path))?
                .get(&file.path)
                .is_some_and(|old| old.size == file.size && old.modified_ms == file.modified_ms);
            if !unchanged {
                files.push(file);
            }
        } else if !path.exists() {
            gone.push(text.clone());
            // A deleted folder: forget everything that was in it.
            gone.extend(library.known_files(&text)?.into_keys());
        }
    }
    if !files.is_empty() {
        store(library, &files)?;
        changed = true;
    }
    if !gone.is_empty() {
        changed |= library.remove_missing(&gone)? > 0;
    }
    Ok(changed)
}

/// Reads and stores one file that is in (or about to join) the library.
pub fn add_file(library: &Library, path: &Path) -> Result<i64, GalleryError> {
    let file = found_file(path).ok_or_else(|| {
        GalleryError::InvalidArgument(format!("{} is not a photo or video", path.display()))
    })?;
    let (metadata, place) = read(&file);
    library.upsert(&new_media(&file, &metadata, place.as_ref()))
}

fn walker(folder: &Path, options: ScanOptions) -> ignore::WalkBuilder {
    let mut builder = ignore::WalkBuilder::new(folder);
    builder
        .hidden(!options.include_hidden)
        .ignore(false)
        .git_ignore(false)
        .git_global(false)
        .git_exclude(false)
        .parents(false)
        .follow_links(false);
    builder
}

fn found_file(path: &Path) -> Option<Found> {
    let format = Format::of(path)?;
    let meta = fs::metadata(path).ok().filter(fs::Metadata::is_file)?;
    Some(Found {
        path: path_text(path).ok()?,
        format,
        size: meta.len(),
        modified_ms: meta
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .and_then(|elapsed| i64::try_from(elapsed.as_millis()).ok())
            .unwrap_or(0),
    })
}

fn read(file: &Found) -> (Metadata, Option<Place>) {
    let metadata = metadata::read(Path::new(&file.path), file.format);
    let place = metadata
        .gps
        .and_then(|(latitude, longitude)| places::lookup(latitude, longitude));
    (metadata, place)
}

fn new_media<'a>(
    file: &'a Found,
    metadata: &'a Metadata,
    place: Option<&'a Place>,
) -> NewMedia<'a> {
    NewMedia {
        path: &file.path,
        format: file.format,
        size: file.size,
        modified_ms: file.modified_ms,
        metadata,
        place,
        screenshot: looks_like_screenshot(Path::new(&file.path)),
    }
}

/// Reads a batch in parallel, then stores it in one transaction.
fn store(library: &Library, batch: &[Found]) -> Result<(), GalleryError> {
    let read: Vec<(Metadata, Option<Place>)> = batch.par_iter().map(read).collect();
    let items: Vec<NewMedia<'_>> = batch
        .iter()
        .zip(&read)
        .map(|(file, (metadata, place))| new_media(file, metadata, place.as_ref()))
        .collect();
    library.upsert_many(&items)?;
    Ok(())
}

/// A path as the UTF-8 text the library stores (other paths are skipped).
pub fn path_text(path: &Path) -> Result<String, GalleryError> {
    path.to_str().map(str::to_owned).ok_or_else(|| {
        GalleryError::InvalidArgument(format!("{} is not valid UTF-8", path.display()))
    })
}

fn parent_text(path: &Path) -> String {
    path.parent()
        .and_then(Path::to_str)
        .map(str::to_owned)
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::{jpeg, png};
    use crate::library::{Collection, Query};
    use genslate_testing::TempTree;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn tree() -> Result<TempTree, Box<dyn std::error::Error>> {
        Ok(TempTree::new()?
            .file("pics/a.jpg", jpeg(40, 30, 10)?)?
            .file("pics/trip/b.png", png(20, 20)?)?
            .file("pics/trip/clip.mp4", "not really a video")?
            .file("pics/notes.txt", "skip me")?
            .file("pics/.hidden/c.jpg", jpeg(10, 10, 5)?)?)
    }

    fn scan(library: &Library, folder: &Path) -> Result<ScanOutcome, GalleryError> {
        sync_folder(
            library,
            folder,
            ScanOptions::default(),
            &AtomicBool::new(false),
            |_| {},
        )
    }

    #[test]
    fn finds_photos_and_videos_and_skips_the_rest() -> TestResult {
        let tree = tree()?;
        let library = Library::open_in_memory()?;
        let root = tree.join("pics");
        library.add_root(&path_text(&root)?)?;
        let mut reports = Vec::new();
        let outcome = sync_folder(
            &library,
            &root,
            ScanOptions::default(),
            &AtomicBool::new(false),
            |report| reports.push(report.clone()),
        )?;
        assert_eq!((outcome.found, outcome.added), (3, 3));
        assert_eq!(reports.last().map(|report| report.read), Some(3));
        let items = library.query(&Query::default())?;
        let a = items.iter().find(|item| item.name == "a.jpg").ok_or("a")?;
        assert_eq!((a.width, a.height), (Some(40), Some(30)));
        let videos = library.query(&Query {
            collection: Collection::Videos,
            ..Query::default()
        })?;
        assert_eq!(videos.len(), 1);

        let hidden = sync_folder(
            &library,
            &root,
            ScanOptions {
                include_hidden: true,
            },
            &AtomicBool::new(false),
            |_| {},
        )?;
        assert_eq!(hidden.added, 1, "the hidden folder's photo");
        Ok(())
    }

    #[test]
    fn rescans_only_read_changes_and_forget_deleted_files() -> TestResult {
        let tree = tree()?;
        let library = Library::open_in_memory()?;
        let root = tree.join("pics");
        scan(&library, &root)?;
        let again = scan(&library, &root)?;
        assert_eq!((again.added, again.updated, again.removed), (0, 0, 0));

        fs::remove_file(tree.join("pics/a.jpg"))?;
        let tree = tree.file("pics/trip/b.png", png(30, 10)?)?;
        let changed = scan(&library, &root)?;
        assert_eq!((changed.added, changed.updated, changed.removed), (0, 1, 1));
        let b = library
            .id_of(&path_text(&tree.join("pics/trip/b.png"))?)?
            .ok_or("b")?;
        assert_eq!(library.item(b)?.width, Some(30));
        Ok(())
    }

    #[test]
    fn cancelling_stops_early() -> TestResult {
        let tree = tree()?;
        let library = Library::open_in_memory()?;
        let outcome = sync_folder(
            &library,
            &tree.join("pics"),
            ScanOptions::default(),
            &AtomicBool::new(true),
            |_| {},
        )?;
        assert!(outcome.cancelled);
        assert!(library.query(&Query::default())?.is_empty());
        Ok(())
    }

    #[test]
    fn watcher_paths_update_the_library() -> TestResult {
        let tree = tree()?;
        let library = Library::open_in_memory()?;
        let root = tree.join("pics");
        library.add_root(&path_text(&root)?)?;
        scan(&library, &root)?;
        let tree = tree.file("pics/new.jpg", jpeg(8, 8, 1)?)?;
        fs::remove_dir_all(tree.join("pics/trip"))?;
        let changed = sync_paths(
            &library,
            &[
                tree.join("pics/new.jpg"),
                tree.join("pics/trip"),
                tree.join("elsewhere.jpg"),
            ],
            ScanOptions::default(),
        )?;
        assert!(changed);
        let mut names: Vec<String> = library
            .query(&Query::default())?
            .into_iter()
            .map(|item| item.name)
            .collect();
        names.sort();
        assert_eq!(names, ["a.jpg", "new.jpg"]);
        assert!(!sync_paths(
            &library,
            &[tree.join("pics/new.jpg")],
            ScanOptions::default()
        )?);
        Ok(())
    }

    #[test]
    fn scanning_a_file_is_refused() -> TestResult {
        let tree = tree()?;
        let library = Library::open_in_memory()?;
        assert!(matches!(
            scan(&library, &tree.join("pics/a.jpg")),
            Err(GalleryError::NotAFolder(_))
        ));
        assert!(add_file(&library, &tree.join("pics/notes.txt")).is_err());
        let id = add_file(&library, &tree.join("pics/a.jpg"))?;
        assert_eq!(library.item(id)?.name, "a.jpg");
        Ok(())
    }
}
