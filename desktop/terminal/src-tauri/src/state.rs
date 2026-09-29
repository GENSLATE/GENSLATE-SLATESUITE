//! [`Terminal`]: the shared state behind every command, event and background thread.

use std::sync::{Mutex, MutexGuard, PoisonError};

use genslate_core_terminal::history::{self, HistoryStore};
use genslate_core_terminal::launch::LaunchArgs;
use genslate_core_terminal::process::ProcessProbe;
use genslate_core_terminal::profiles::{self, Platform, Profile, SystemShellEnv};
use genslate_core_terminal::pty::SessionManager;
use genslate_core_terminal::snippets;
use genslate_core_terminal::watch::DirWatcher;
use genslate_core_terminal::{Config, TerminalSettings};
use genslate_paths::AppPaths;

/// Everything the terminal shares across threads (managed by Tauri).
#[derive(Debug)]
pub struct Terminal {
    pub paths: AppPaths,
    config: Mutex<Config>,
    pub sessions: SessionManager,
    /// `None` when the history database could not open (the app works without it).
    pub history: Option<HistoryStore>,
    probe: Mutex<ProcessProbe>,
    watcher: Mutex<Option<DirWatcher>>,
    /// Detected lazily (it runs `wsl.exe` / `vswhere.exe` on Windows), then kept.
    profiles: Mutex<Option<Vec<Profile>>>,
    /// `--cwd` / `--profile` from the first launch.
    pub launch: LaunchArgs,
    /// Serialises the read-modify-write of `snippets.toml`.
    snippets: Mutex<()>,
}

impl Terminal {
    /// Opens the history database (logging why when it can't) and starts empty.
    pub fn new(paths: AppPaths, config: Config, launch: LaunchArgs) -> Self {
        let history = match HistoryStore::open(&paths.data_dir.join(history::FILE_NAME)) {
            Ok(store) => Some(store),
            Err(error) => {
                log::warn!("command history is off: {error}");
                None
            }
        };
        Self {
            paths,
            config: Mutex::new(config),
            sessions: SessionManager::new(),
            history,
            probe: Mutex::new(ProcessProbe::new()),
            watcher: Mutex::new(None),
            profiles: Mutex::new(None),
            launch,
            snippets: Mutex::new(()),
        }
    }

    pub fn config(&self) -> MutexGuard<'_, Config> {
        lock(&self.config)
    }

    /// Runs `update` (a read-modify-write of `config.toml`) while holding the config lock, so
    /// two setting changes never interleave, then keeps the config it returns.
    pub fn update_config<E>(
        &self,
        update: impl FnOnce() -> Result<Config, E>,
    ) -> Result<TerminalSettings, E> {
        let mut config = lock(&self.config);
        let updated = update()?;
        let settings = updated.terminal.clone();
        *config = updated;
        Ok(settings)
    }

    /// The `[terminal]` settings in effect.
    pub fn settings(&self) -> TerminalSettings {
        self.config().terminal.clone()
    }

    /// Every profile (detected on first use).
    pub fn profiles(&self) -> Vec<Profile> {
        let mut cached = lock(&self.profiles);
        if let Some(profiles) = cached.as_ref() {
            return profiles.clone();
        }
        let custom = self.config().profiles.clone();
        let detected = profiles::detect(&SystemShellEnv, Platform::current(), &custom);
        log::info!(
            "shell profiles: {}",
            detected
                .iter()
                .map(|profile| profile.id.as_str())
                .collect::<Vec<_>>()
                .join(", ")
        );
        *cached = Some(detected.clone());
        detected
    }

    /// `snippets.toml` next to `config.toml`.
    pub fn snippets_file(&self) -> std::path::PathBuf {
        self.paths.config_dir.join(snippets::FILE_NAME)
    }

    /// Held while `snippets.toml` is read and rewritten.
    pub fn snippets_lock(&self) -> MutexGuard<'_, ()> {
        lock(&self.snippets)
    }

    pub fn probe(&self) -> MutexGuard<'_, ProcessProbe> {
        lock(&self.probe)
    }

    pub fn watcher(&self) -> MutexGuard<'_, Option<DirWatcher>> {
        lock(&self.watcher)
    }
}

/// A poisoned lock only means another thread panicked mid-update; the data is still usable.
fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}
