//! Watches the library folders (recursively) so new, changed, moved and deleted files show up
//! without a rescan. `notify-debouncer-full` settles bursts (a camera import, a big copy) and
//! pairs renames, then the changed paths are handed to [`crate::scan::sync_paths`].

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::time::Duration;

use notify_debouncer_full::notify::{EventKind, RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{DebounceEventResult, Debouncer, RecommendedCache, new_debouncer};

use crate::GalleryError;

/// Watches a set of library folders; dropping it stops watching.
pub struct LibraryWatcher {
    debouncer: Debouncer<RecommendedWatcher, RecommendedCache>,
    watched: BTreeSet<PathBuf>,
}

impl std::fmt::Debug for LibraryWatcher {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("LibraryWatcher")
            .field("watched", &self.watched)
            .finish_non_exhaustive()
    }
}

impl LibraryWatcher {
    /// Starts a watcher that calls `on_change` with the changed paths once no event has
    /// arrived for `settle`.
    pub fn new(
        settle: Duration,
        on_change: impl Fn(Vec<PathBuf>) + Send + 'static,
    ) -> Result<Self, GalleryError> {
        let debouncer = new_debouncer(settle, None, move |result: DebounceEventResult| {
            let Ok(events) = result else {
                return;
            };
            let paths: BTreeSet<PathBuf> = events
                .iter()
                .filter(|event| {
                    matches!(
                        event.kind,
                        EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
                    )
                })
                .flat_map(|event| event.paths.iter().cloned())
                .collect();
            if !paths.is_empty() {
                on_change(paths.into_iter().collect());
            }
        })?;
        Ok(Self {
            debouncer,
            watched: BTreeSet::new(),
        })
    }

    /// Watches exactly `folders` (starting and stopping as needed). Folders that can't be
    /// watched are logged and skipped.
    pub fn set_folders(&mut self, folders: &[PathBuf]) {
        let wanted: BTreeSet<PathBuf> = folders.iter().cloned().collect();
        for gone in self
            .watched
            .difference(&wanted)
            .cloned()
            .collect::<Vec<_>>()
        {
            if let Err(error) = self.debouncer.unwatch(&gone) {
                log::debug!("unwatch {}: {error}", gone.display());
            }
            self.watched.remove(&gone);
        }
        for folder in wanted
            .difference(&self.watched)
            .cloned()
            .collect::<Vec<_>>()
        {
            match self.debouncer.watch(&folder, RecursiveMode::Recursive) {
                Ok(()) => {
                    self.watched.insert(folder);
                }
                Err(error) => log::warn!("can't watch {}: {error}", folder.display()),
            }
        }
    }

    /// The folders being watched.
    pub fn folders(&self) -> impl Iterator<Item = &Path> {
        self.watched.iter().map(PathBuf::as_path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;
    use std::sync::mpsc;

    #[test]
    fn reports_new_files() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.dir("pics/inner")?;
        let (tx, rx) = mpsc::channel();
        let mut watcher = LibraryWatcher::new(Duration::from_millis(100), move |paths| {
            let _ = tx.send(paths);
        })?;
        watcher.set_folders(&[tree.join("pics"), tree.join("missing")]);
        assert_eq!(watcher.folders().count(), 1, "missing folders are skipped");
        std::fs::write(tree.join("pics/inner/new.jpg"), "x")?;
        let paths = rx.recv_timeout(Duration::from_secs(10))?;
        assert!(
            paths.iter().any(|path| path.ends_with("new.jpg")),
            "{paths:?}"
        );
        watcher.set_folders(&[]);
        assert_eq!(watcher.folders().count(), 0);
        Ok(())
    }
}
