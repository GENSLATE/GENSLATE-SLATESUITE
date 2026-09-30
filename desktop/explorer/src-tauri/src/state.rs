//! [`Explorer`]: the shared state behind every command, event and background thread.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};

use genslate_core_explorer::Config;
use genslate_core_explorer::thumbnail::ThumbnailCache;
use genslate_core_explorer::undo::UndoAction;
use genslate_core_explorer::watch::FolderWatcher;
use genslate_paths::AppPaths;

/// Undo keeps this many operations.
const UNDO_DEPTH: usize = 50;

/// Everything the explorer shares across threads (managed by Tauri).
#[derive(Debug)]
pub struct Explorer {
    pub paths: AppPaths,
    /// Thumbnails for the `explorer-thumb` scheme, in `<cache dir>/thumbnails`.
    pub thumbnails: ThumbnailCache,
    config: Mutex<Config>,
    /// Folders the user has opened this session. The preview protocol only serves files that
    /// sit directly in one of them, so a page can't read arbitrary files by URL.
    browsed: Mutex<HashSet<PathBuf>>,
    /// Cancel flags of running transfers, searches and size counts, by task id.
    tasks: Mutex<HashMap<String, Arc<AtomicBool>>>,
    undo: Mutex<Vec<UndoAction>>,
    watcher: Mutex<Option<FolderWatcher>>,
}

impl Explorer {
    pub fn new(paths: AppPaths, config: Config) -> Self {
        Self {
            thumbnails: ThumbnailCache::new(paths.cache_dir.join("thumbnails")),
            paths,
            config: Mutex::new(config),
            browsed: Mutex::new(HashSet::new()),
            tasks: Mutex::new(HashMap::new()),
            undo: Mutex::new(Vec::new()),
            watcher: Mutex::new(None),
        }
    }

    pub fn config(&self) -> MutexGuard<'_, Config> {
        lock(&self.config)
    }

    pub fn set_config(&self, config: Config) {
        *lock(&self.config) = config;
    }

    /// Remembers that the user opened `folder`.
    pub fn mark_browsed(&self, folder: &Path) {
        lock(&self.browsed).insert(folder.to_path_buf());
    }

    /// `true` when `file` sits directly in a folder the user opened.
    pub fn may_preview(&self, file: &Path) -> bool {
        file.parent()
            .is_some_and(|folder| lock(&self.browsed).contains(folder))
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

    pub fn watcher(&self) -> MutexGuard<'_, Option<FolderWatcher>> {
        lock(&self.watcher)
    }
}

/// A poisoned lock only means another thread panicked mid-update; the data is still usable.
fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}
