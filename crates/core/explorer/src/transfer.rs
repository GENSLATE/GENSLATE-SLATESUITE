//! Copy and move with progress, cancellation and a conflict policy.
//!
//! A transfer first measures its sources (so progress has a total), then works item by item.
//! Files are copied in chunks so a cancel stops within one chunk; the partly written file is
//! removed. What finished before a cancel stays, and is reported so it can be undone.

use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

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
        // Keep the original's timestamps and read-only flag, like the OS file managers do.
        if let Ok(modified) = meta.modified()
            && let Err(error) = writer.set_modified(modified)
        {
            log::debug!("could not keep the date of {}: {error}", target.display());
        }
        drop(writer);
        if let Err(error) = fs::set_permissions(target, meta.permissions()) {
            log::debug!(
                "could not keep the permissions of {}: {error}",
                target.display()
            );
        }
        Ok(true)
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
/// zero: the total is only for the progress bar.
pub fn measure(paths: &[PathBuf]) -> (u64, u64) {
    let mut bytes = 0;
    let mut items = 0;
    let mut stack: Vec<PathBuf> = paths.to_vec();
    while let Some(path) = stack.pop() {
        let Ok(meta) = fs::symlink_metadata(&path) else {
            continue;
        };
        items += 1;
        if meta.is_dir() {
            if let Ok(children) = fs::read_dir(&path) {
                stack.extend(children.flatten().map(|child| child.path()));
            }
        } else if meta.is_file() {
            bytes += meta.len();
        }
    }
    (bytes, items)
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
    fn measures_trees() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?
            .file("x/a.txt", "abc")?
            .file("x/y/b.txt", "de")?;
        assert_eq!(measure(&[tree.join("x")]), (5, 4));
        Ok(())
    }
}
