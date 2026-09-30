//! [`Gallery`]: the shared state behind every command, event, scheme and background thread.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};

use genslate_core_gallery::Config;
use genslate_core_gallery::library::Library;
use genslate_core_gallery::thumbnail::ThumbnailCache;
use genslate_core_gallery::watch::LibraryWatcher;
use genslate_paths::AppPaths;

/// Undo keeps this many operations.
const UNDO_DEPTH: usize = 30;

/// How to reverse one finished operation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum UndoAction {
    /// Items renamed or moved: `(id, from, to)`.
    Relocate { items: Vec<(i64, PathBuf, PathBuf)> },
    /// Items moved to the Trash from these paths.
    Trash { items: Vec<(i64, PathBuf)> },
}

impl UndoAction {
    /// What Undo will do, for menus and toasts ("Undo Move to Trash").
    pub fn label(&self) -> &'static str {
        match self {
            Self::Relocate { items } if items.len() == 1 => "Rename",
            Self::Relocate { .. } => "Move",
            Self::Trash { .. } => "Move to Trash",
        }
    }
}

/// Everything the gallery shares across threads (managed by Tauri).
#[derive(Debug)]
pub struct Gallery {
    pub paths: AppPaths,
    pub library: Library,
    pub thumbnails: ThumbnailCache,
    config: Mutex<Config>,
    /// Cancel flags of running scans, duplicate searches and exports, by task id.
    tasks: Mutex<HashMap<String, Arc<AtomicBool>>>,
    undo: Mutex<Vec<UndoAction>>,
    watcher: Mutex<Option<LibraryWatcher>>,
    /// Held while a scan runs, so two scans never write at once.
    scanning: Mutex<()>,
    /// Files or folders the app was started with (`genslate-gallery <path>`).
    launch: Mutex<Vec<PathBuf>>,
}

impl Gallery {
    pub fn new(paths: AppPaths, config: Config, library: Library, launch: Vec<PathBuf>) -> Self {
        Self {
            thumbnails: ThumbnailCache::new(paths.cache_dir.join("thumbnails")),
            paths,
            library,
            config: Mutex::new(config),
            tasks: Mutex::new(HashMap::new()),
            undo: Mutex::new(Vec::new()),
            watcher: Mutex::new(None),
            scanning: Mutex::new(()),
            launch: Mutex::new(launch),
        }
    }

    pub fn config(&self) -> MutexGuard<'_, Config> {
        lock(&self.config)
    }

    pub fn set_config(&self, config: Config) {
        *lock(&self.config) = config;
    }

    /// Registers a new task and returns its cancel flag. An id already running is refused.
    pub fn start_task(&self, id: &str) -> Option<Arc<AtomicBool>> {
        let mut tasks = lock(&self.tasks);
        if tasks.contains_key(id) {
            return None;
        }
        let flag = Arc::new(AtomicBool::new(false));
        tasks.insert(id.to_owned(), Arc::clone(&flag));
        Some(flag)
    }

    /// The cancel flag of a running task.
    pub fn task(&self, id: &str) -> Option<Arc<AtomicBool>> {
        lock(&self.tasks).get(id).cloned()
    }

    pub fn finish_task(&self, id: &str) {
        lock(&self.tasks).remove(id);
    }

    /// Records an operation for Undo; returns the new top label.
    pub fn push_undo(&self, action: UndoAction) -> &'static str {
        let mut stack = lock(&self.undo);
        let label = action.label();
        stack.push(action);
        if stack.len() > UNDO_DEPTH {
            stack.remove(0);
        }
        label
    }

    pub fn pop_undo(&self) -> Option<UndoAction> {
        lock(&self.undo).pop()
    }

    /// What Undo would reverse next.
    pub fn undo_label(&self) -> Option<&'static str> {
        lock(&self.undo).last().map(UndoAction::label)
    }

    pub fn watcher(&self) -> MutexGuard<'_, Option<LibraryWatcher>> {
        lock(&self.watcher)
    }

    /// Waits for any running scan, then holds the scan lock.
    pub fn scan_lock(&self) -> MutexGuard<'_, ()> {
        lock(&self.scanning)
    }

    /// The launch paths, once (later calls get nothing).
    pub fn take_launch(&self) -> Vec<PathBuf> {
        std::mem::take(&mut *lock(&self.launch))
    }
}

/// A poisoned lock only means another thread panicked mid-update; the data is still usable.
fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn undo_labels() {
        let rename = UndoAction::Relocate {
            items: vec![(1, PathBuf::from("/a"), PathBuf::from("/b"))],
        };
        assert_eq!(rename.label(), "Rename");
        let moved = UndoAction::Relocate {
            items: vec![
                (1, PathBuf::from("/a"), PathBuf::from("/b")),
                (2, PathBuf::from("/c"), PathBuf::from("/d")),
            ],
        };
        assert_eq!(moved.label(), "Move");
        assert_eq!(
            UndoAction::Trash { items: Vec::new() }.label(),
            "Move to Trash"
        );
    }
}
