//! Live file tree: watches the folders the tree shows (not recursively) and reports which of
//! them changed once a burst of events has settled.

use std::collections::BTreeSet;
use std::path::PathBuf;
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Arc, Mutex, PoisonError};
use std::thread;
use std::time::Duration;

use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};

use crate::TerminalError;

/// Watches a changing set of folders; dropping it stops watching.
pub struct DirWatcher {
    watcher: RecommendedWatcher,
    watched: Arc<Mutex<BTreeSet<PathBuf>>>,
}

impl std::fmt::Debug for DirWatcher {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DirWatcher")
            .field("watched", &self.folders())
            .finish_non_exhaustive()
    }
}

impl DirWatcher {
    /// Starts a watcher that calls `on_change` with the watched folders whose contents changed,
    /// once no event has arrived for `settle` (the terminal uses 250 ms).
    pub fn new(
        settle: Duration,
        on_change: impl Fn(Vec<PathBuf>) + Send + 'static,
    ) -> Result<Self, TerminalError> {
        let folders: Arc<Mutex<BTreeSet<PathBuf>>> = Arc::default();
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
                // The receiver only disappears when the watcher is being dropped.
                if tx.send(path).is_err() {
                    return;
                }
            }
        })?;
        let known = Arc::clone(&folders);
        thread::Builder::new()
            .name("terminal-watch".to_owned())
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
                    let folders = changed_folders(&batch, &lock(&known));
                    if !folders.is_empty() {
                        on_change(folders);
                    }
                }
            })
            .map_err(TerminalError::io(
                "could not start watching",
                "terminal-watch",
            ))?;
        Ok(Self {
            watcher,
            watched: folders,
        })
    }

    /// Watches exactly `folders` from now on (adds new ones, drops the rest). Folders that
    /// can't be watched (removed, no permission) are skipped and logged.
    pub fn set_folders(&mut self, folders: impl IntoIterator<Item = PathBuf>) {
        let wanted: BTreeSet<PathBuf> = folders.into_iter().collect();
        let current = lock(&self.watched).clone();
        for gone in current.difference(&wanted) {
            if let Err(error) = self.watcher.unwatch(gone) {
                log::debug!("unwatch {}: {error}", gone.display());
            }
        }
        let mut watched = BTreeSet::new();
        for folder in wanted {
            if current.contains(&folder) {
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
        *lock(&self.watched) = watched;
    }

    /// The folders being watched.
    pub fn folders(&self) -> BTreeSet<PathBuf> {
        lock(&self.watched).clone()
    }
}

/// The watched folders affected by changes to `paths`: a changed item's folder, or the folder
/// itself when it was the one created, renamed or removed.
fn changed_folders(paths: &BTreeSet<PathBuf>, watched: &BTreeSet<PathBuf>) -> Vec<PathBuf> {
    let mut folders = BTreeSet::new();
    for path in paths {
        if watched.contains(path) {
            folders.insert(path.clone());
        }
        if let Some(parent) = path.parent().filter(|parent| watched.contains(*parent)) {
            folders.insert(parent.to_path_buf());
        }
    }
    folders.into_iter().collect()
}

fn lock<T>(mutex: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

#[cfg(test)]
mod tests {
    use std::sync::mpsc::channel;

    use genslate_testing::TempTree;

    use super::*;

    #[test]
    fn reports_changed_folders() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.dir("a")?.dir("b")?;
        let (tx, rx) = channel();
        let mut watcher = DirWatcher::new(Duration::from_millis(100), move |folders| {
            let _ = tx.send(folders);
        })?;
        let a = tree.join("a");
        watcher.set_folders([a.clone()]);
        assert!(watcher.folders().contains(&a));
        thread::sleep(Duration::from_millis(100));
        tree.write("a/new.txt", "x")?;
        tree.write("b/ignored.txt", "x")?;
        let batch = rx.recv_timeout(Duration::from_secs(5))?;
        assert_eq!(batch, [a]);
        Ok(())
    }

    #[test]
    fn replaces_the_watched_set_and_skips_missing_folders() -> Result<(), Box<dyn std::error::Error>>
    {
        let tree = TempTree::new()?.dir("a")?;
        let mut watcher = DirWatcher::new(Duration::from_millis(50), |_| {})?;
        watcher.set_folders([
            tree.join("missing"),
            tree.join("a"),
            tree.path().to_path_buf(),
        ]);
        assert_eq!(watcher.folders().len(), 2);
        watcher.set_folders([tree.join("a")]);
        assert_eq!(watcher.folders().len(), 1);
        watcher.set_folders([]);
        assert!(watcher.folders().is_empty());
        Ok(())
    }

    #[test]
    fn maps_event_paths_to_watched_folders() {
        let watched = BTreeSet::from([PathBuf::from("/w/a"), PathBuf::from("/w/b")]);
        let paths = BTreeSet::from([
            PathBuf::from("/w/a/file"),
            PathBuf::from("/w/b"),
            PathBuf::from("/w/c/file"),
        ]);
        assert_eq!(
            changed_folders(&paths, &watched),
            [PathBuf::from("/w/a"), PathBuf::from("/w/b")]
        );
    }
}
