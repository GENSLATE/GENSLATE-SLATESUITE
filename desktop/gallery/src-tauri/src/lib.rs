//! GENSLATE Gallery: the Tauri 2 shell.
//!
//! Startup order: resolve portable paths (`genslate-paths`) → load the TOML config
//! (`genslate-core-gallery`) → open the library database → register plugins, the thumbnail
//! and media schemes and the folder watcher → create the window (webview profile in the app's
//! cache folder) → paint it with the Nord canvas colour (no white flash) → rescan the library
//! folders in the background.

mod commands;
mod error;
mod events;
mod schemes;
mod state;
mod window;

use std::path::{Path, PathBuf};
use std::time::Duration;

use genslate_core_gallery::library::{self, Library};
use genslate_core_gallery::scan::{self, ScanOptions};
use genslate_core_gallery::watch::LibraryWatcher;
use genslate_core_gallery::{Config, LogLevel, places};
use genslate_paths::AppPaths;
use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_window_state::StateFlags;

pub use error::AppError;

/// Kebab-case app name: config file, log folder and `other/logs/app-logs/<name>`.
const APP_NAME: &str = "gallery";

/// Builds and runs the app. Exits with status 1 if startup fails.
pub fn run() {
    if let Err(error) = try_run() {
        report_fatal(&error);
        std::process::exit(1);
    }
}

fn try_run() -> Result<(), AppError> {
    let context = tauri::generate_context!();
    let paths = genslate_paths::resolve(APP_NAME)?;
    // A broken config must not stop the app: fall back to defaults and log why once the
    // logger is up.
    let (config, config_error) = match Config::load(&paths.config_file) {
        Ok(config) => (config, None),
        Err(error) => (Config::default(), Some(error)),
    };

    let mut builder = tauri::Builder::default()
        // Must be registered first so a second launch focuses the running window.
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            open_from_second_launch(app, &args, &cwd);
        }))
        .plugin(log_plugin(&paths, config.logging.level))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init());
    if config.window.remember_state {
        builder = builder.plugin(
            tauri_plugin_window_state::Builder::default()
                // Decorations and visibility are owned by tauri.conf.json, not the saved state.
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED | StateFlags::FULLSCREEN)
                // The plugin joins this onto the OS config dir; an absolute path replaces it,
                // which keeps the state file portable.
                .with_filename(window_state_file(&paths))
                .build(),
        );
    }

    // A library that can't open (a locked or broken file) must not stop the app either:
    // browse in memory for this session and say why in the log.
    let library_file = paths.data_dir.join(library::FILE_NAME);
    let (library, library_error) = match Library::open(&library_file) {
        Ok(library) => (library, None),
        Err(error) => (Library::open_in_memory()?, Some(error)),
    };
    let launch = launch_paths(&std::env::args().collect::<Vec<_>>(), &launch_base());
    let gallery = state::Gallery::new(paths.clone(), config.clone(), library, launch);

    builder
        .manage(gallery)
        .register_asynchronous_uri_scheme_protocol(schemes::THUMB_SCHEME, schemes::handle_thumb)
        .register_asynchronous_uri_scheme_protocol(schemes::MEDIA_SCHEME, schemes::handle_media)
        .setup(move |app| {
            log::info!(
                "{} {} ({:?} mode, root {})",
                app.package_info().name,
                app.package_info().version,
                paths.mode(),
                paths.layout.root.display()
            );
            log::debug!(
                "config: {}, logs: {}",
                paths.config_file.display(),
                paths.log_dir.display()
            );
            if let Some(error) = &config_error {
                log::warn!("using default config: {error}");
            }
            if let Some(error) = &library_error {
                log::error!(
                    "{} could not open, using a temporary library: {error}",
                    library_file.display()
                );
            }
            places::warm_up();
            start_watcher(app.handle());
            rescan_on_start(app.handle());
            window::create_main_window(app.handle(), paths.cache_dir.join("webview"))?;
            window::prepare_main_window(app.handle(), config.appearance.theme)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_info::get_app_info,
            commands::library::get_context,
            commands::library::get_summary,
            commands::library::query_media,
            commands::library::get_details,
            commands::library::add_folder,
            commands::library::add_folder_path,
            commands::library::remove_folder,
            commands::library::rescan,
            commands::library::open_paths,
            commands::library::set_favorite,
            commands::library::set_rating,
            commands::library::add_tag,
            commands::library::remove_tag,
            commands::library::create_album,
            commands::library::rename_album,
            commands::library::delete_album,
            commands::library::add_to_album,
            commands::library::remove_from_album,
            commands::library::set_setting,
            commands::files::rename_media,
            commands::files::move_media,
            commands::files::copy_media,
            commands::files::trash_media,
            commands::files::restore_media,
            commands::files::forget_media,
            commands::files::undo,
            commands::files::open_media,
            commands::files::reveal_media,
            commands::files::save_edit,
            commands::tasks::find_duplicates,
            commands::tasks::export_media,
            commands::tasks::cancel_task,
        ])
        .run(context)?;
    Ok(())
}

/// Keeps the library in step with the disk: changed paths under the library folders are read
/// or forgotten, then the UI refreshes. Without a watcher (e.g. the OS limit on watches is
/// reached) changes show up on the next rescan.
fn start_watcher<R: Runtime>(app: &AppHandle<R>) {
    let handle = app.clone();
    let watcher = LibraryWatcher::new(Duration::from_millis(600), move |changed_paths| {
        let gallery = handle.state::<state::Gallery>();
        let options = ScanOptions {
            include_hidden: gallery.config().gallery.include_hidden,
        };
        match scan::sync_paths(&gallery.library, &changed_paths, options) {
            Ok(true) => commands::changed(&handle),
            Ok(false) => {}
            Err(error) => log::warn!("live update: {error}"),
        }
    });
    let gallery = app.state::<state::Gallery>();
    match watcher {
        Ok(watcher) => *gallery.watcher() = Some(watcher),
        Err(error) => log::warn!("live update is off: {error}"),
    }
    commands::library::refresh_watcher(&gallery);
}

/// Catches up with changes made while Gallery was closed.
fn rescan_on_start<R: Runtime>(app: &AppHandle<R>) {
    match app.state::<state::Gallery>().library.roots() {
        Ok(roots) => {
            commands::library::start_scan(app, roots.into_iter().map(PathBuf::from).collect());
        }
        Err(error) => log::warn!("library folders: {error}"),
    }
}

/// What a second launch asks to open.
#[derive(Debug, Clone, Serialize)]
struct OpenPayload {
    paths: Vec<String>,
}

/// Hands a second launch's paths (`genslate-gallery <file or folder>…`) to the UI and brings
/// the window forward.
fn open_from_second_launch<R: Runtime>(app: &AppHandle<R>, args: &[String], cwd: &str) {
    let paths: Vec<String> = launch_paths(args, Path::new(cwd))
        .into_iter()
        .filter_map(|path| path.to_str().map(str::to_owned))
        .collect();
    if !paths.is_empty() {
        commands::emit(app, events::OPEN, OpenPayload { paths });
    }
    focus_main_window(app);
}

/// The file and folder arguments (flags skipped), made absolute against `base`.
fn launch_paths(args: &[String], base: &Path) -> Vec<PathBuf> {
    args.iter()
        .skip(1)
        .filter(|arg| !arg.starts_with('-'))
        .map(|arg| base.join(arg))
        .filter(|path| path.exists())
        .collect()
}

/// The folder relative launch paths are resolved against: the launching process's folder.
fn launch_base() -> PathBuf {
    std::env::current_dir()
        .ok()
        .or_else(dirs::home_dir)
        .unwrap_or_default()
}

/// `<data dir>/window-state.json`, as the string the window-state plugin expects.
fn window_state_file(paths: &AppPaths) -> String {
    paths
        .data_dir
        .join("window-state.json")
        .to_string_lossy()
        .into_owned()
}

/// Logs to stdout and to `<log dir>/gallery.log` (see `genslate-paths` for the folder).
fn log_plugin<R: Runtime>(paths: &AppPaths, level: LogLevel) -> tauri::plugin::TauriPlugin<R> {
    tauri_plugin_log::Builder::new()
        .clear_targets()
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::Folder {
                path: paths.log_dir.clone(),
                file_name: Some(APP_NAME.to_owned()),
            }),
        ])
        .level(log::LevelFilter::from(level))
        .max_file_size(5 * 1024 * 1024)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(5))
        .build()
}

fn focus_main_window<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window(window::MAIN) else {
        return;
    };
    let result = window
        .unminimize()
        .and_then(|()| window.show())
        .and_then(|()| window.set_focus());
    if let Err(error) = result {
        log::warn!("could not focus the main window: {error}");
    }
}

#[expect(
    clippy::print_stderr,
    reason = "the logger may not be running when startup fails"
)]
fn report_fatal(error: &AppError) {
    log::error!("fatal: {error}");
    eprintln!("genslate-gallery: {error}");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn launch_paths_skip_flags_and_missing_files() {
        let base = std::env::temp_dir();
        let args = vec![
            "genslate-gallery".to_owned(),
            "--verbose".to_owned(),
            ".".to_owned(),
            "no-such-file.jpg".to_owned(),
        ];
        assert_eq!(launch_paths(&args, &base), vec![base.join(".")]);
    }
}
