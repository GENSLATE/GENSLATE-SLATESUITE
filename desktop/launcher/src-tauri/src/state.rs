//! [`Launcher`]: the shared state behind every command, event and background thread.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard, PoisonError, RwLock, RwLockReadGuard, RwLockWriteGuard};
use std::time::Instant;

use genslate_core_launcher::catalog::{Catalog, CatalogRoots, HostOs};
use genslate_core_launcher::config::{Keybindings, LauncherConfig};
use genslate_core_launcher::recent::RecentLaunches;
use genslate_core_launcher::watch::{FileWatcher, SelfWrites};
use genslate_paths::{AppPaths, Mode, SHARED_PROFILE};
use serde::Serialize;

/// `config.toml` + `keybindings.toml`, plus the last problem reading them.
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub config: LauncherConfig,
    pub keybindings: Keybindings,
    /// Set when a file was invalid; the previous good values stay in use.
    pub issue: Option<String>,
}

/// Window state owned by the shell.
#[derive(Debug, Default)]
pub struct WindowFlags {
    pub pinned: bool,
    pub expanded: bool,
    pub visible: bool,
    /// When the window last hid — a tray click hides (blur) *then* toggles.
    pub hidden_at: Option<Instant>,
}

/// Everything the launcher shares across threads (managed by Tauri).
#[derive(Debug)]
pub struct Launcher {
    pub paths: AppPaths,
    pub roots: CatalogRoots,
    /// Programs may only be launched from inside these folders.
    pub allowed_roots: Vec<PathBuf>,
    pub settings: RwLock<Settings>,
    pub catalog: RwLock<Catalog>,
    pub recent: Mutex<RecentLaunches>,
    pub self_writes: SelfWrites,
    pub window: Mutex<WindowFlags>,
    /// The UI is showing a popup that may extend outside the frame: no click-through.
    pub popup_open: AtomicBool,
    /// The status bar wants telemetry samples.
    pub telemetry_active: AtomicBool,
    pub watcher: Mutex<Option<FileWatcher>>,
}

impl Launcher {
    /// Builds the state for `paths`, scanning the catalog once.
    pub fn new(paths: AppPaths, settings: Settings) -> Self {
        let layout = &paths.layout;
        let dev_target =
            (layout.mode == Mode::Dev).then(|| layout.root.join("target").join("debug"));
        let roots = CatalogRoots {
            programs: layout.programs.clone(),
            metadata: paths.metadata_dir.clone(),
            icons: layout
                .other
                .join("resources")
                .join("icons")
                .join("genslate"),
            dev_target: dev_target.clone(),
            host: HostOs::current(),
        };
        let allowed_roots = layout
            .programs
            .iter()
            .chain(dev_target.iter())
            .cloned()
            .collect();
        let recent = RecentLaunches::load(&recent_file(&paths));
        let pinned = settings.config.behavior.pinned;
        Self {
            catalog: RwLock::new(Catalog::scan(&roots)),
            roots,
            allowed_roots,
            settings: RwLock::new(settings),
            recent: Mutex::new(recent),
            self_writes: SelfWrites::default(),
            window: Mutex::new(WindowFlags {
                pinned,
                ..WindowFlags::default()
            }),
            popup_open: AtomicBool::new(false),
            telemetry_active: AtomicBool::new(false),
            watcher: Mutex::new(None),
            paths,
        }
    }

    pub fn settings(&self) -> RwLockReadGuard<'_, Settings> {
        self.settings.read().unwrap_or_else(PoisonError::into_inner)
    }

    pub fn settings_mut(&self) -> RwLockWriteGuard<'_, Settings> {
        self.settings
            .write()
            .unwrap_or_else(PoisonError::into_inner)
    }

    pub fn catalog(&self) -> RwLockReadGuard<'_, Catalog> {
        self.catalog.read().unwrap_or_else(PoisonError::into_inner)
    }

    pub fn catalog_mut(&self) -> RwLockWriteGuard<'_, Catalog> {
        self.catalog.write().unwrap_or_else(PoisonError::into_inner)
    }

    pub fn recent(&self) -> MutexGuard<'_, RecentLaunches> {
        self.recent.lock().unwrap_or_else(PoisonError::into_inner)
    }

    pub fn window(&self) -> MutexGuard<'_, WindowFlags> {
        self.window.lock().unwrap_or_else(PoisonError::into_inner)
    }

    /// Rescans every app source, keeping the running state.
    pub fn rescan(&self) {
        let fresh = Catalog::scan(&self.roots);
        *self.catalog_mut() = fresh;
    }

    /// `storage/users/shared` — the right-hand rail's folders live here.
    pub fn profile_dir(&self) -> PathBuf {
        self.paths.layout.profile_dir(SHARED_PROFILE)
    }

    pub fn is_visible(&self) -> bool {
        self.window().visible
    }

    pub fn popup_open(&self) -> bool {
        self.popup_open.load(Ordering::Relaxed)
    }
}

/// `other/databases/genslate/launcher/recent.toml`
pub fn recent_file(paths: &AppPaths) -> PathBuf {
    paths.data_dir.join("recent.toml")
}
