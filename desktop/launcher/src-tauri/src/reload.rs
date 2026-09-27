//! Hot reload: settings files and app folders are watched; edits apply without a restart.

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::time::Duration;

use genslate_core_launcher::catalog::Source;
use genslate_core_launcher::config::{Keybindings, LauncherConfig};
use genslate_core_launcher::watch::{self, WatchTarget};
use genslate_paths::AppPaths;
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::state::{Launcher, Settings};
use crate::{events, hotkey, window};

/// Reads both settings files. An invalid file keeps `previous` values and reports why.
pub fn load_settings(paths: &AppPaths, previous: Option<&Settings>) -> Settings {
    let fallback = previous.cloned().unwrap_or_default();
    let mut issues = Vec::new();
    let config = LauncherConfig::load(&paths.config_file).unwrap_or_else(|error| {
        issues.push(error.to_string());
        fallback.config.clone()
    });
    let keybindings = Keybindings::load(&paths.keybindings_file).unwrap_or_else(|error| {
        issues.push(error.to_string());
        fallback.keybindings.clone()
    });
    Settings {
        config,
        keybindings,
        issue: (!issues.is_empty()).then(|| issues.join("\n")),
    }
}

/// Starts watching config, metadata and program folders.
pub fn start<R: Runtime>(app: &AppHandle<R>) {
    let launcher = app.state::<Launcher>();
    let mut targets = vec![
        WatchTarget {
            path: launcher.paths.config_dir.clone(),
            recursive: false,
        },
        WatchTarget {
            path: launcher.paths.metadata_dir.clone(),
            recursive: false,
        },
    ];
    if let Some(programs) = &launcher.paths.layout.programs {
        targets.extend(Source::ALL.iter().map(|source| WatchTarget {
            path: programs.join(source.folder()),
            // A new app is a folder with files; one level of depth is enough to notice it.
            recursive: true,
        }));
    }
    let handle = app.clone();
    match watch::watch(&targets, Duration::from_millis(200), move |changed| {
        on_change(&handle, &changed);
    }) {
        Ok(watcher) => {
            if let Ok(mut slot) = launcher.watcher.lock() {
                *slot = Some(watcher);
            }
        }
        Err(error) => log::warn!("hot reload is off: {error}"),
    }
}

fn on_change<R: Runtime>(app: &AppHandle<R>, changed: &BTreeSet<PathBuf>) {
    let launcher = app.state::<Launcher>();
    let foreign: Vec<&PathBuf> = changed
        .iter()
        .filter(|path| !launcher.self_writes.is_own(path))
        .collect();
    let settings_changed = foreign.iter().any(|path| {
        is_file(path, &launcher.paths.config_file)
            || is_file(path, &launcher.paths.keybindings_file)
    });
    let catalog_changed = foreign.iter().any(|path| {
        path.starts_with(&launcher.paths.metadata_dir)
            || launcher
                .paths
                .layout
                .programs
                .as_ref()
                .is_some_and(|programs| path.starts_with(programs))
    });
    if settings_changed {
        reload_settings(app);
    }
    if catalog_changed {
        launcher.rescan();
        emit(app, events::CATALOG, ());
    }
}

/// Re-reads the settings and applies what changed (hotkey, size, pin, autostart).
pub fn reload_settings<R: Runtime>(app: &AppHandle<R>) {
    let launcher = app.state::<Launcher>();
    let previous = launcher.settings().clone();
    let next = load_settings(&launcher.paths, Some(&previous));
    if let Some(issue) = &next.issue {
        log::warn!("settings: {issue}");
    }
    *launcher.settings_mut() = next.clone();

    if previous.keybindings.global.toggle != next.keybindings.global.toggle {
        hotkey::register(app, &next.keybindings.global.toggle);
    }
    if previous.config.appearance.size != next.config.appearance.size
        && let Err(error) = window::apply_size(app)
    {
        log::warn!("could not resize: {error}");
    }
    if previous.config.behavior.pinned != next.config.behavior.pinned
        && let Err(error) = window::set_pinned(app, next.config.behavior.pinned)
    {
        log::warn!("could not pin: {error}");
    }
    if previous.config.behavior.autostart != next.config.behavior.autostart {
        crate::autostart::apply(app, next.config.behavior.autostart);
    }
    emit(app, events::SETTINGS, next);
}

fn is_file(path: &Path, file: &Path) -> bool {
    path == file || (path.parent() == file.parent() && path.file_name() == file.file_name())
}

/// Emits an event; a failed emit only means the UI isn't listening yet.
pub fn emit<R: Runtime, S: serde::Serialize + Clone>(app: &AppHandle<R>, event: &str, payload: S) {
    if let Err(error) = app.emit(event, payload) {
        log::debug!("emit {event}: {error}");
    }
}
