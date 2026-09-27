//! Hot reload: watches the config/metadata folders and the program folders, and reports the
//! changed paths once a burst of events has settled.
//!
//! Folders (not files) are watched because editors save atomically (write temp + rename),
//! which replaces the watched file. The launcher's own writes are filtered with [`SelfWrites`].

use std::collections::{BTreeSet, HashMap};
use std::fs;
use std::hash::{DefaultHasher, Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::sync::mpsc::{self, RecvTimeoutError};
use std::thread;
use std::time::Duration;

use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};

use crate::LauncherError;

/// A folder to watch.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WatchTarget {
    pub path: PathBuf,
    /// Also watch sub-folders (program folders: only one level matters, but new apps are
    /// folders with files inside).
    pub recursive: bool,
}

/// Keeps the OS watcher alive; dropping it stops watching (and the debounce thread).
pub struct FileWatcher {
    _watcher: RecommendedWatcher,
}

impl std::fmt::Debug for FileWatcher {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("FileWatcher")
    }
}

/// Watches `targets` and calls `on_change` with every path that changed during a burst, once
/// no event has arrived for `settle`. Missing folders are skipped (logged).
pub fn watch(
    targets: &[WatchTarget],
    settle: Duration,
    on_change: impl Fn(BTreeSet<PathBuf>) + Send + 'static,
) -> Result<FileWatcher, LauncherError> {
    let (tx, rx) = mpsc::channel::<PathBuf>();
    let mut watcher = notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
        let Ok(event) = event else {
            return;
        };
        if matches!(
            event.kind,
            EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
        ) {
            for path in event.paths {
                // The receiver only disappears when the watcher is being dropped.
                if tx.send(path).is_err() {
                    return;
                }
            }
        }
    })?;
    for target in targets {
        let mode = if target.recursive {
            RecursiveMode::Recursive
        } else {
            RecursiveMode::NonRecursive
        };
        if let Err(error) = watcher.watch(&target.path, mode) {
            log::debug!("not watching {}: {error}", target.path.display());
        }
    }
    thread::Builder::new()
        .name("launcher-watch".to_owned())
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
        .map_err(|source| LauncherError::Spawn {
            path: PathBuf::from("launcher-watch"),
            source,
        })?;
    Ok(FileWatcher { _watcher: watcher })
}

/// Files the launcher itself wrote, by content hash, so their change events are ignored.
#[derive(Debug, Default)]
pub struct SelfWrites(Mutex<HashMap<PathBuf, u64>>);

impl SelfWrites {
    /// Remembers that the launcher wrote `text` to `path`.
    pub fn record(&self, path: &Path, text: &str) {
        if let Ok(mut map) = self.0.lock() {
            map.insert(path.to_path_buf(), hash(text.as_bytes()));
        }
    }

    /// `true` if `path` still has exactly the content the launcher wrote (the event is ours).
    pub fn is_own(&self, path: &Path) -> bool {
        let Ok(map) = self.0.lock() else {
            return false;
        };
        let Some(expected) = map.get(path) else {
            return false;
        };
        fs::read(path).is_ok_and(|bytes| hash(&bytes) == *expected)
    }
}

fn hash(bytes: &[u8]) -> u64 {
    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    hasher.finish()
}

#[cfg(test)]
mod tests {
    use super::*;
    use genslate_testing::TempTree;
    use std::sync::mpsc::channel;

    #[test]
    fn reports_a_settled_batch_of_changes() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?.dir("config")?;
        let (tx, rx) = channel();
        let _watcher = watch(
            &[WatchTarget {
                path: tree.join("config"),
                recursive: false,
            }],
            Duration::from_millis(100),
            move |paths| {
                let _ = tx.send(paths);
            },
        )?;
        thread::sleep(Duration::from_millis(100));
        tree.write("config/config.toml", "a = 1")?;
        tree.write("config/keybindings.toml", "b = 2")?;
        let batch = rx.recv_timeout(Duration::from_secs(5))?;
        assert!(
            batch.iter().any(|path| path.ends_with("config.toml")),
            "{batch:?}"
        );
        Ok(())
    }

    #[test]
    fn missing_folders_are_skipped() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        let watcher = watch(
            &[WatchTarget {
                path: tree.join("nope"),
                recursive: true,
            }],
            Duration::from_millis(50),
            |_| {},
        );
        assert!(watcher.is_ok());
        Ok(())
    }

    #[test]
    fn recognises_its_own_writes() -> Result<(), Box<dyn std::error::Error>> {
        let tree = TempTree::new()?;
        let path = tree.write("genslate.toml", "x = 1")?;
        let own = SelfWrites::default();
        assert!(!own.is_own(&path));
        own.record(&path, "x = 1");
        assert!(own.is_own(&path));
        tree.write("genslate.toml", "x = 2")?;
        assert!(!own.is_own(&path), "a user edit after ours is not ours");
        Ok(())
    }
}
