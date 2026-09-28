//! Live refresh: watches the folders the tabs show (not recursively) and reports which of
//! them changed once a burst of events has settled.

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::thread;
use std::time::Duration;

use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};

use crate::ExplorerError;

/// Watches a changing set of folders; dropping it stops watching.
pub struct FolderWatcher {
    watcher: RecommendedWatcher,
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
        let (tx, rx) = mpsc::channel::<PathBuf>();
        let watcher = notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
            let Ok(event) = event else {
                return;
            };
            if !matches!(
                event.kind,
                EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
            ) {
                return;
            }
            for path in event.paths {
                // A changed item means its folder's listing changed.
                let folder = path
                    .parent()
                    .map_or_else(|| path.clone(), Path::to_path_buf);
                // The receiver only disappears when the watcher is being dropped.
                if tx.send(folder).is_err() {
                    return;
                }
            }
        })?;
        thread::Builder::new()
            .name("explorer-watch".to_owned())
            .spawn(move || {
                while let Ok(first) = rx.recv() {
                    let mut batch = BTreeSet::from([first]);
                    loop {
                        match rx.recv_timeout(settle) {
                            Ok(path) => {
                                batch.insert(path);
                            }
                            Err(RecvTimeoutError::Timeout) => break,
                            Err(RecvTimeoutError::Disconnected) => return,
                        }
                    }
                    on_change(batch);
                }
            })
            .map_err(ExplorerError::io(
                "could not start watching",
                "explorer-watch",
            ))?;
        Ok(Self {
            watcher,
            watched: BTreeSet::new(),
        })
    }

    /// Watches exactly `folders` from now on (adds new ones, drops the rest). Folders that
    /// can't be watched (removed, no permission) are skipped and logged.
    pub fn set_folders(&mut self, folders: impl IntoIterator<Item = PathBuf>) {
        let wanted: BTreeSet<PathBuf> = folders.into_iter().collect();
        for gone in self.watched.difference(&wanted) {
            if let Err(error) = self.watcher.unwatch(gone) {
                log::debug!("unwatch {}: {error}", gone.display());
            }
        }
        let mut watched = BTreeSet::new();
        for folder in wanted {
            if self.watched.contains(&folder) {
                watched.insert(folder);
                continue;
            }
            match self.watcher.watch(&folder, RecursiveMode::NonRecursive) {
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

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;
    use std::sync::mpsc::channel;

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
