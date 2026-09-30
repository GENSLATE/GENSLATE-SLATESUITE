//! Copy and move with progress, cancellation and a conflict policy.
//!
//! A transfer first measures its sources (so progress has a total), then works item by item.
//! Files are copied in chunks so a cancel stops within one chunk; the partly written file is
//! removed. What finished before a cancel stays, and is reported so it can be undone.
//!
//! On file systems with copy-on-write clones (APFS, Btrfs, XFS, Windows Dev Drives) a file is
//! first cloned with `reflink-copy`, which is instant and shares the data blocks; anywhere else
//! the chunked copy runs. Either way the copy keeps the original's dates and permissions.

use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

use filetime::FileTime;
use ignore::{WalkBuilder, WalkState};
use serde::{Deserialize, Serialize};

use crate::ExplorerError;
use crate::entry::{display_name, require_absolute, require_dir};
use crate::names::{exists, unique_path};

/// Bytes copied between progress reports and cancel checks.
const CHUNK: usize = 1024 * 1024;

/// Copy or move.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TransferMode {
    Copy,
    Move,
}

/// What to do when the destination already has an item with the same name.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ConflictPolicy {
    /// The existing item goes to the trash, then the new one takes its place.
    Replace,
    /// The new item gets a free name (`report (2).pdf`).
    #[default]
    KeepBoth,
    /// The item is left where it is.
    Skip,
}

/// Progress of a running transfer.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    pub done_bytes: u64,
    pub total_bytes: u64,
    pub done_items: u64,
    pub total_items: u64,
    /// Name of the file being worked on.
    pub current: String,
}

/// What a transfer did.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferOutcome {
    /// `(source, destination)` for every top-level item that was copied or moved.
    pub done: Vec<(PathBuf, PathBuf)>,
    /// Top-level sources left alone (conflict skipped, or already in the destination).
    pub skipped: Vec<PathBuf>,
    /// Existing items that were trashed to make room (`Replace`).
    pub replaced: Vec<PathBuf>,
    pub cancelled: bool,
}

/// A copy or move request.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Transfer {
    pub mode: TransferMode,
    pub sources: Vec<PathBuf>,
    pub destination: PathBuf,
    pub policy: ConflictPolicy,
}

/// Names in `destination` that sources would collide with. Items already in `destination`
/// don't count (moving them there is a no-op; copying them makes a duplicate).
pub fn find_conflicts(
    sources: &[PathBuf],
    destination: &Path,
) -> Result<Vec<String>, ExplorerError> {
    let destination = require_dir(destination)?;
    let mut names = Vec::new();
    for source in sources {
        let source = require_absolute(source)?;
        if source.parent() == Some(destination.as_path()) {
            continue;
        }
        let name = display_name(&source);
        if exists(&destination.join(&name)) {
            names.push(name);
        }
    }
    Ok(names)
}

/// Runs `transfer`, calling `on_progress` after each chunk and item. Stops early (with
/// `cancelled: true`) once `cancel` is set.
pub fn run(
    transfer: &Transfer,
    cancel: &AtomicBool,
    mut on_progress: impl FnMut(&Progress),
) -> Result<TransferOutcome, ExplorerError> {
    let destination = require_dir(&transfer.destination)?;
    let sources = transfer
        .sources
        .iter()
        .map(|source| require_absolute(source))
        .collect::<Result<Vec<_>, _>>()?;
    for source in &sources {
        if !exists(source) {
            return Err(ExplorerError::NotFound(source.clone()));
        }
        if fs::symlink_metadata(source).is_ok_and(|meta| meta.is_dir())
            && destination.starts_with(source)
        {
            return Err(ExplorerError::IntoItself(source.clone()));
        }
    }

    let (total_bytes, total_items) = measure(&sources);
    let mut job = Job {
        cancel,
        on_progress: &mut on_progress,
        progress: Progress {
            total_bytes,
            total_items,
            ..Progress::default()
        },
    };
    let mut outcome = TransferOutcome::default();

    for source in sources {
        if job.cancelled() {
            outcome.cancelled = true;
            break;
        }
        let in_place = source.parent() == Some(destination.as_path());
        let name = display_name(&source);
        let target = if in_place {
            if transfer.mode == TransferMode::Move {
                outcome.skipped.push(source);
                continue;
            }
            unique_path(&destination, &name)
        } else {
            let target = destination.join(&name);
            if exists(&target) {
                match transfer.policy {
                    ConflictPolicy::Skip => {
                        outcome.skipped.push(source);
                        continue;
                    }
                    ConflictPolicy::KeepBoth => unique_path(&destination, &name),
                    ConflictPolicy::Replace => {
                        trash::delete(&target)?;
                        outcome.replaced.push(target.clone());
                        target
                    }
                }
            } else {
                target
            }
        };

        let finished = match transfer.mode {
            TransferMode::Copy => job.copy_item(&source, &target)?,
            TransferMode::Move => job.move_item(&source, &target)?,
        };
        if finished {
            outcome.done.push((source, target));
        } else {
            outcome.cancelled = true;
            break;
        }
    }
    Ok(outcome)
}

struct Job<'a, F: FnMut(&Progress)> {
    cancel: &'a AtomicBool,
    on_progress: &'a mut F,
    progress: Progress,
}

impl<F: FnMut(&Progress)> Job<'_, F> {
    fn cancelled(&self) -> bool {
        self.cancel.load(Ordering::Relaxed)
    }

    fn report(&mut self) {
        (self.on_progress)(&self.progress);
    }

    /// Moves by renaming; across drives, copies then deletes the source.
    fn move_item(&mut self, source: &Path, target: &Path) -> Result<bool, ExplorerError> {
        self.progress.current = display_name(source);
        match fs::rename(source, target) {
            Ok(()) => {
                let (bytes, items) = measure(std::slice::from_ref(&target.to_path_buf()));
                self.progress.done_bytes += bytes;
                self.progress.done_items += items;
                self.report();
                Ok(true)
            }
            Err(error) if error.kind() == io::ErrorKind::CrossesDevices => {
                if !self.copy_item(source, target)? {
                    return Ok(false);
                }
                let meta = fs::symlink_metadata(source)
                    .map_err(ExplorerError::io("could not read", source))?;
                let removed = if meta.is_dir() {
                    fs::remove_dir_all(source)
                } else {
                    fs::remove_file(source)
                };
                removed.map_err(ExplorerError::io("could not remove", source))?;
                Ok(true)
            }
            Err(error) => Err(ExplorerError::io("could not move", source)(error)),
        }
    }

    /// Copies a file, folder (recursively) or symlink. `false` when cancelled.
    fn copy_item(&mut self, source: &Path, target: &Path) -> Result<bool, ExplorerError> {
        if self.cancelled() {
            return Ok(false);
        }
        let meta =
            fs::symlink_metadata(source).map_err(ExplorerError::io("could not read", source))?;
        self.progress.current = display_name(source);
        if meta.file_type().is_symlink() {
            copy_symlink(source, target)?;
        } else if meta.is_dir() {
            fs::create_dir(target).map_err(ExplorerError::io("could not create", target))?;
            let children =
                fs::read_dir(source).map_err(ExplorerError::io("could not open", source))?;
            for child in children {
                let child = child.map_err(ExplorerError::io("could not read", source))?;
                if !self.copy_item(&child.path(), &target.join(child.file_name()))? {
                    return Ok(false);
                }
            }
        } else if !self.copy_file(source, target, &meta)? {
            return Ok(false);
        }
        self.progress.done_items += 1;
        self.report();
        Ok(true)
    }

    fn copy_file(
        &mut self,
        source: &Path,
        target: &Path,
        meta: &fs::Metadata,
    ) -> Result<bool, ExplorerError> {
        if try_clone(source, target) {
            self.progress.done_bytes += meta.len();
            self.report();
        } else if !self.copy_bytes(source, target)? {
            return Ok(false);
        }
        keep_metadata(target, meta);
        Ok(true)
    }

    /// The chunked copy: progress after every chunk, and a cancel removes the partial file.
    fn copy_bytes(&mut self, source: &Path, target: &Path) -> Result<bool, ExplorerError> {
        let mut reader = File::open(source).map_err(ExplorerError::io("could not open", source))?;
        let mut writer =
            File::create_new(target).map_err(ExplorerError::io("could not create", target))?;
        let mut buffer = vec![0; CHUNK];
        loop {
            if self.cancelled() {
                drop(writer);
                // Best effort: a partial copy is worse than none.
                if let Err(error) = fs::remove_file(target) {
                    log::warn!(
                        "could not remove partial copy {}: {error}",
                        target.display()
                    );
                }
                return Ok(false);
            }
            let read = reader
                .read(&mut buffer)
                .map_err(ExplorerError::io("could not read", source))?;
            if read == 0 {
                break;
            }
            writer
                .write_all(&buffer[..read])
                .map_err(ExplorerError::io("could not write", target))?;
            self.progress.done_bytes += read as u64;
            self.report();
        }
        Ok(true)
    }
}

/// Clones `source` to the new file `target` copy-on-write. `false` (with nothing left at
/// `target`) when the file system can't, the two are on different drives, or anything else
/// fails: the caller then copies the bytes, which reports the real error if there is one.
fn try_clone(source: &Path, target: &Path) -> bool {
    match reflink_copy::reflink(source, target) {
        Ok(()) => true,
        // Someone else's file: never remove it (the byte copy refuses it too).
        Err(error) if error.kind() == io::ErrorKind::AlreadyExists => false,
        Err(error) => {
            log::trace!("no clone for {}: {error}", target.display());
            // `reflink-copy` cleans up after itself on Linux and Windows; macOS's clonefile
            // is atomic. This covers any platform that leaves a partial file behind.
            match fs::remove_file(target) {
                Ok(()) => log::debug!("removed partial clone {}", target.display()),
                Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                Err(error) => log::warn!(
                    "could not remove partial clone {}: {error}",
                    target.display()
                ),
            }
            false
        }
    }
}

/// Keeps the original's modified and accessed times and read-only flag, like the OS file
/// managers do. Times go first: a read-only file can't have its times set on Windows.
fn keep_metadata(target: &Path, meta: &fs::Metadata) {
    let accessed = FileTime::from_last_access_time(meta);
    let modified = FileTime::from_last_modification_time(meta);
    if let Err(error) = filetime::set_file_times(target, accessed, modified) {
        log::debug!("could not keep the dates of {}: {error}", target.display());
    }
    if let Err(error) = fs::set_permissions(target, meta.permissions()) {
        log::debug!(
            "could not keep the permissions of {}: {error}",
            target.display()
        );
    }
}

#[cfg(unix)]
fn copy_symlink(source: &Path, target: &Path) -> Result<(), ExplorerError> {
    let link = fs::read_link(source).map_err(ExplorerError::io("could not read", source))?;
    std::os::unix::fs::symlink(link, target).map_err(ExplorerError::io("could not create", target))
}

/// Windows needs privileges to create symlinks: copy what the link points to (files only; a
/// linked folder could loop, so it is skipped).
#[cfg(not(unix))]
fn copy_symlink(source: &Path, target: &Path) -> Result<(), ExplorerError> {
    match fs::metadata(source) {
        Ok(meta) if meta.is_file() => fs::copy(source, target)
            .map(|_| ())
            .map_err(ExplorerError::io("could not copy", source)),
        _ => {
            log::info!("skipped linked folder {}", source.display());
            Ok(())
        }
    }
}

/// Total bytes and items (files, folders and links) under `paths`. Unreadable parts count as
/// zero: the total is only for the progress bar. Folders are walked in parallel; links are
/// counted, not followed.
pub fn measure(paths: &[PathBuf]) -> (u64, u64) {
    let mut bytes = 0;
    let mut items = 0;
    let mut folders = Vec::new();
    // The walker would follow a linked top-level folder, so top-level items are sorted here.
    for path in paths {
        let Ok(meta) = fs::symlink_metadata(path) else {
            continue;
        };
        if meta.is_dir() {
            folders.push(path);
        } else {
            items += 1;
            if meta.is_file() {
                bytes += meta.len();
            }
        }
    }
    let Some((first, rest)) = folders.split_first() else {
        return (bytes, items);
    };
    let (walked_bytes, walked_items) = (AtomicU64::new(0), AtomicU64::new(0));
    let mut builder = WalkBuilder::new(first);
    for folder in rest {
        builder.add(folder);
    }
    builder
        .standard_filters(false)
        .hidden(false)
        .follow_links(false);
    builder.build_parallel().run(|| {
        Box::new(|result| {
            let Ok(entry) = result else {
                return WalkState::Continue;
            };
            walked_items.fetch_add(1, Ordering::Relaxed);
            if entry.file_type().is_some_and(|kind| kind.is_file())
                && let Ok(meta) = entry.metadata()
            {
                walked_bytes.fetch_add(meta.len(), Ordering::Relaxed);
            }
            WalkState::Continue
        })
    });
    (
        bytes + walked_bytes.into_inner(),
        items + walked_items.into_inner(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;

    fn copy(sources: Vec<PathBuf>, destination: PathBuf, policy: ConflictPolicy) -> Transfer {
        Transfer {
            mode: TransferMode::Copy,
            sources,
            destination,
            policy,
        }
    }

    #[test]
    fn copies_files_and_folders_with_progress() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("src/a.txt", "aaaa")?
            .file("src/folder/b.txt", "bb")?
            .dir("dst")?;
        let mut reports = Vec::new();
        let outcome = run(
            &copy(
                vec![tree.join("src/a.txt"), tree.join("src/folder")],
                tree.join("dst"),
                ConflictPolicy::KeepBoth,
            ),
            &AtomicBool::new(false),
            |progress| reports.push(progress.clone()),
        )?;
        assert_eq!(tree.read("dst/a.txt")?, "aaaa");
        assert_eq!(tree.read("dst/folder/b.txt")?, "bb");
        assert!(tree.join("src/a.txt").exists(), "copy keeps the source");
        assert_eq!(outcome.done.len(), 2);
        let last = reports.last().ok_or("no progress")?;
        assert_eq!(last.done_bytes, 6);
        assert_eq!(last.total_bytes, 6);
        assert_eq!(last.done_items, last.total_items);
        Ok(())
    }

    #[test]
    fn copy_into_the_same_folder_duplicates() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("a.txt", "x")?;
        let outcome = run(
            &copy(
                vec![tree.join("a.txt")],
                tree.path().to_path_buf(),
                ConflictPolicy::Skip,
            ),
            &AtomicBool::new(false),
            |_| {},
        )?;
        assert!(outcome.done[0].1.ends_with("a (2).txt"));
        Ok(())
    }

    #[test]
    fn conflicts_follow_the_policy() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("src/a.txt", "new")?
            .file("dst/a.txt", "old")?;
        let sources = vec![tree.join("src/a.txt")];
        assert_eq!(find_conflicts(&sources, &tree.join("dst"))?, vec!["a.txt"]);

        let skipped = run(
            &copy(sources.clone(), tree.join("dst"), ConflictPolicy::Skip),
            &AtomicBool::new(false),
            |_| {},
        )?;
        assert_eq!(skipped.skipped.len(), 1);
        assert_eq!(tree.read("dst/a.txt")?, "old");

        let both = run(
            &copy(sources, tree.join("dst"), ConflictPolicy::KeepBoth),
            &AtomicBool::new(false),
            |_| {},
        )?;
        assert!(both.done[0].1.ends_with("a (2).txt"));
        assert_eq!(tree.read("dst/a (2).txt")?, "new");
        assert_eq!(tree.read("dst/a.txt")?, "old");
        Ok(())
    }

    #[test]
    fn moves_and_skips_items_already_there() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("src/a.txt", "a")?
            .file("dst/b.txt", "b")?;
        let outcome = run(
            &Transfer {
                mode: TransferMode::Move,
                sources: vec![tree.join("src/a.txt"), tree.join("dst/b.txt")],
                destination: tree.join("dst"),
                policy: ConflictPolicy::KeepBoth,
            },
            &AtomicBool::new(false),
            |_| {},
        )?;
        assert!(!tree.join("src/a.txt").exists());
        assert_eq!(tree.read("dst/a.txt")?, "a");
        assert_eq!(outcome.skipped, vec![tree.join("dst/b.txt")]);
        Ok(())
    }

    #[test]
    fn refuses_to_put_a_folder_inside_itself() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.dir("a/b")?;
        let result = run(
            &copy(
                vec![tree.join("a")],
                tree.join("a/b"),
                ConflictPolicy::KeepBoth,
            ),
            &AtomicBool::new(false),
            |_| {},
        );
        assert!(matches!(result, Err(ExplorerError::IntoItself(_))));
        Ok(())
    }

    #[test]
    fn cancel_stops_before_work() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("a.txt", "a")?.dir("dst")?;
        let outcome = run(
            &copy(
                vec![tree.join("a.txt")],
                tree.join("dst"),
                ConflictPolicy::KeepBoth,
            ),
            &AtomicBool::new(true),
            |_| {},
        )?;
        assert!(outcome.cancelled);
        assert!(outcome.done.is_empty());
        assert!(!tree.join("dst/a.txt").exists());
        Ok(())
    }

    #[test]
    fn copies_keep_their_dates() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("a.txt", "abc")?.dir("dst")?;
        let past = FileTime::from_unix_time(1_600_000_000, 0);
        filetime::set_file_times(tree.join("a.txt"), past, past)?;
        run(
            &copy(
                vec![tree.join("a.txt")],
                tree.join("dst"),
                ConflictPolicy::KeepBoth,
            ),
            &AtomicBool::new(false),
            |_| {},
        )?;
        let copied = fs::metadata(tree.join("dst/a.txt"))?;
        assert_eq!(FileTime::from_last_modification_time(&copied), past);
        assert_eq!(tree.read("dst/a.txt")?, "abc");
        Ok(())
    }

    #[test]
    fn measures_trees() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("x/a.txt", "abc")?
            .file("x/y/b.txt", "de")?;
        assert_eq!(measure(&[tree.join("x")]), (5, 4));
        assert_eq!(
            measure(&[tree.join("x/y"), tree.join("x/a.txt"), tree.join("gone")]),
            (5, 3)
        );
        Ok(())
    }
}
