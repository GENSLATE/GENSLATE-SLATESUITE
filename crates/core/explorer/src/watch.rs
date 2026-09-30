//! Live refresh: watches the folders the tabs show (not recursively) and reports which of
//! them changed once a burst of events has settled.
//!
//! `notify-debouncer-full` does the settling (and pairs the two halves of a rename), like the
//! Gallery's library watcher; this module only maps changed paths to their folders.

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::time::Duration;

use notify_debouncer_full::notify::{EventKind, RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{DebounceEventResult, Debouncer, RecommendedCache, new_debouncer};

use crate::ExplorerError;

/// Watches a changing set of folders; dropping it stops watching.
pub struct FolderWatcher {
    debouncer: Debouncer<RecommendedWatcher, RecommendedCache>,
    watched: BTreeSet<PathBuf>,
}

impl std::fmt::Debug for FolderWatcher {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("FolderWatcher")
            .field("watched", &self.watched)
            .finish_non_exhaustive()
    }
}

impl FolderWatcher {
    /// Starts a watcher that calls `on_change` with the watched folders whose contents changed,
    /// once no event has arrived for `settle`.
    pub fn new(
        settle: Duration,
        on_change: impl Fn(BTreeSet<PathBuf>) + Send + 'static,
    ) -> Result<Self, ExplorerError> {
        let debouncer = new_debouncer(settle, None, move |result: DebounceEventResult| {
            let events = match result {
                Ok(events) => events,
                Err(errors) => {
                    for error in errors {
                        log::debug!("watch: {error}");
                    }
                    return;
                }
            };
            let folders: BTreeSet<PathBuf> = events
                .iter()
                .filter(|event| {
                    matches!(
                        event.kind,
                        EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
                    )
                })
                // A rename carries both paths; each one's folder changed.
                .flat_map(|event| event.paths.iter())
                .map(|path| folder_of(path))
                .collect();
            if !folders.is_empty() {
                on_change(folders);
            }
        })?;
        Ok(Self {
            debouncer,
            watched: BTreeSet::new(),
        })
    }

    /// Watches exactly `folders` from now on (adds new ones, drops the rest). Folders that
    /// can't be watched (removed, no permission) are skipped and logged.
    pub fn set_folders(&mut self, folders: impl IntoIterator<Item = PathBuf>) {
        let wanted: BTreeSet<PathBuf> = folders.into_iter().collect();
        for gone in self.watched.difference(&wanted) {
            if let Err(error) = self.debouncer.unwatch(gone) {
                log::debug!("unwatch {}: {error}", gone.display());
            }
        }
        let mut watched = BTreeSet::new();
        for folder in wanted {
            if self.watched.contains(&folder) {
                watched.insert(folder);
                continue;
            }
            match self.debouncer.watch(&folder, RecursiveMode::NonRecursive) {
                Ok(()) => {
                    watched.insert(folder);
                }
                Err(error) => log::debug!("not watching {}: {error}", folder.display()),
            }
        }
        self.watched = watched;
    }

    /// The folders being watched.
    pub fn folders(&self) -> &BTreeSet<PathBuf> {
        &self.watched
    }
}

/// A changed item means its folder's listing changed.
fn folder_of(path: &Path) -> PathBuf {
    path.parent()
        .map_or_else(|| path.to_path_buf(), Path::to_path_buf)
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;
    use std::sync::mpsc::channel;
    use std::thread;

    #[test]
    fn reports_changed_folders() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.dir("a")?.dir("b")?;
        let (tx, rx) = channel();
        let mut watcher = FolderWatcher::new(Duration::from_millis(100), move |folders| {
            let _ = tx.send(folders);
        })?;
        watcher.set_folders([tree.join("a")]);
        assert_eq!(watcher.folders().len(), 1);
        thread::sleep(Duration::from_millis(100));
        tree.write("a/new.txt", "x")?;
        let batch = rx.recv_timeout(Duration::from_secs(5))?;
        assert!(
            batch.iter().any(|folder| folder.ends_with("a")),
            "{batch:?}"
        );
        Ok(())
    }

    #[test]
    fn renames_report_both_folders() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.file("a/old.txt", "x")?.dir("b")?;
        let (tx, rx) = channel();
        let mut watcher = FolderWatcher::new(Duration::from_millis(100), move |folders| {
            let _ = tx.send(folders);
        })?;
        watcher.set_folders([tree.join("a"), tree.join("b")]);
        thread::sleep(Duration::from_millis(100));
        std::fs::rename(tree.join("a/old.txt"), tree.join("b/new.txt"))?;
        let mut seen = BTreeSet::new();
        while !(seen.iter().any(|f: &PathBuf| f.ends_with("a"))
            && seen.iter().any(|f: &PathBuf| f.ends_with("b")))
        {
            seen.extend(rx.recv_timeout(Duration::from_secs(5))?);
        }
        Ok(())
    }

    #[test]
    fn skips_missing_folders() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        let mut watcher = FolderWatcher::new(Duration::from_millis(50), |_| {})?;
        watcher.set_folders([tree.join("missing"), tree.path().to_path_buf()]);
        assert_eq!(watcher.folders().len(), 1);
        watcher.set_folders([]);
        assert!(watcher.folders().is_empty());
        Ok(())
    }
}
